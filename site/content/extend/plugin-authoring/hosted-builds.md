---
title: Hosted & In-Memory Builds
description: The ProjectFiles seam and the fetch-then-build materialization pattern for rendering a repo with no local filesystem
---

# Hosted & In-Memory Builds

refrakt's build pipeline can run **without a local filesystem**. The page corpus is a plain-object `ContentTree`, the core packages (transform, runes, svelte, behaviors) operate on strings and trees, and every ad-hoc file read — snippet sources, sandbox `src` directories, namespaced `fileRoots` partials, the plan plugin's scan — goes through one injectable seam: **`ProjectFiles`** (SPEC-113).

This page is for two audiences:

- **Adapter / host authors** building a renderer that feeds refrakt content from somewhere other than disk (a GitHub fetch, a database, an in-browser authoring sandbox).
- **Plugin authors** whose pipeline hooks read files, so they read through the provider instead of `node:fs` and work in both fs and hosted modes.

If you only write self-hosted sites, you never touch this — the CLI and the framework adapters construct the provider for you.

## The `ProjectFiles` contract

One synchronous interface, defined in `@refrakt-md/types`:

```ts
interface ProjectFiles {
  read(path: string): string | null;
  list(path: string): string[];
  exists(path: string): boolean;
}
```

The rules:

- **Keys, not paths.** Every argument is a normalized POSIX, project-root-relative key — never absolute, never containing `..` after normalization.
- **Containment is part of the contract.** Implementations reject absolute paths and any path that escapes the root, treating a violation exactly like an absent file: `read` returns `null`, `list` returns `[]`, `exists` returns `false`. Callers never re-implement path safety — a `src="../../etc/passwd"` is denied by the provider, not by each consumer.
- **`list` is `readdir`-shaped.** It returns the immediate child entry names (basenames) directly under a directory key; the empty string lists the project root.
- **Synchronous.** Markdoc's transform is synchronous and the `sandbox` rune reads its `src` at transform time, so the provider boundary sits **in front of** the pipeline (at materialization time), not inside it. There is deliberately no async reader threaded through the build.

### Stock providers

The interface lives in the package root; the providers are a Node-only subpath so a browser bundle that only imports `@refrakt-md/types` never pulls in `node:fs`:

```ts
import {
  fsProjectFiles,
  memoryProjectFiles,
  recordingProjectFiles,
} from '@refrakt-md/types/project-files';
```

- **`fsProjectFiles(rootDir)`** — the OSS/CLI default. Wraps `node:fs`, anchored at the project root, and enforces containment (absolute reject, traversal reject, symlink-escape reject via `realpath`). This is what `loadContent` constructs for a self-hosted build.
- **`memoryProjectFiles(files: Map<string, string>)`** — the hosted/editor provider. Backed by a plain map of normalized keys; traversal is structurally impossible. `list` and `exists` are derived from key prefixes, and reads pass through to the **live** map, so a warm host can patch a single key between builds without reconstructing the provider.
- **`recordingProjectFiles(inner, onRead)`** — a thin pass-through that reports every `{ op, key }` access. Pure instrumentation, no behaviour change. It is the per-page read-set capture point {% ref "ADR-025" /%} names as the groundwork for incremental rebuild — see [below](#towards-incremental-rebuild).

### When a consumer should read through it

A plugin pipeline hook that reads a project file should take the provider from the context rather than importing an fs-bound reader:

- **Preprocess hooks** receive a `ProjectFiles` on the `PreprocessContext` (`ctx.sandbox`). This is the same provider the transform-time sandbox reads through — snippet, expand, and file-ref all resolve through it.
- **`configure` hooks** receive `projectFiles` on `PluginConfigureOptions`. A plugin that scans the project at configure time (the way `@refrakt-md/plan` scans `plan.dir`) walks it through the provider so a hosted build stays fs-free, falling back to direct `fs` only when no provider is wired.

Reading through the provider is what makes your plugin work unchanged in a hosted deployment — and what makes its reads *recordable* for future incremental builds.

## Fetch-then-build: the materialization pattern

For a remote source, the provider is **materialized before the build**, which keeps the whole pipeline synchronous. The hosted product (a GitHub app that renders a tenant's repo on push) follows this recipe:

1. **Fetch the repo tarball at the commit SHA.** One API call, an atomic snapshot — no torn reads across a push, and rate-limit-friendly versus per-file `contents` calls.
2. **Unpack to a `Map<string, string>`** of normalized keys. Binary assets are the host's concern — served from its own storage/CDN, not the pipeline.
3. **Assemble the `ContentTree` from the map** by key-prefix filtering (the content directory). `ContentTree.fromContentMap` does exactly this.
4. **Build** with `memoryProjectFiles(map)` and `loadContentFromTree`.

```ts
import { ContentTree, loadContentFromTree } from '@refrakt-md/content';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';

// `files` is the materialized repo: normalized POSIX keys → file contents.
const files: Map<string, string> = await materializeTarball(repo, sha);

const tree = ContentTree.fromContentMap(files, { contentDir: 'site/content' });

const site = await loadContentFromTree(tree, {
  projectFiles: memoryProjectFiles(files),
  projectRoot: '/',               // the key anchor for the provider
  sandboxExamplesDir: 'examples', // project-relative key for sandbox `src`
  gitTimestamps,                  // optional: from the source's history API
  // …icons, plugins, xrefPatterns, repoUrl, etc. — the host owns config.
});
```

`loadContentFromTree` accepts `projectFiles` and `gitTimestamps` (a remote host supplies timestamps from its source's history API; omit for frontmatter-only dates). The GitHub specifics — App auth, the tarball endpoint, webhook handling — belong to the hosted product; **steps 3–4 above are the entire integration surface**: no fs, no traversal surface, no async plumbing.

### One map, the tree derived from it

The materialized `Map` is the **single** surface the build reads from. The `ContentTree` is *assembled from it* (`fromContentMap` filters by the content-dir prefix: `_layout.md` becomes a directory's layout, `_partials/…` at the content root become partials, other `.md` files become pages), and `memoryProjectFiles(map)` serves **every** ad-hoc read — snippet, sandbox `src`, `fileRoots`, the plan scan — from that *same* map.

There is one materialization surface, not two. That is what keeps a refresh coherent: you never have a `ContentTree` built from one snapshot and a file provider reading from another.

### Warm instances & incremental fetch

Nothing in the contract requires re-fetching the whole tarball per change. A long-lived host can keep the map resident and, on a single-file webhook, fetch just that key and re-run `loadContentFromTree` over the updated map — `memoryProjectFiles` reads through to the live map, so no provider reconstruction is needed.

The tradeoff is **consistency**:

- **Tarball-at-SHA** is an atomic snapshot — every key is from the same commit.
- **Single-key patch** from a "file changed" event is cheaper to fetch but can straddle two commits if the underlying push touched siblings (renames, multi-file commits).

Incremental *fetch* is a host-side materialization choice; the synchronous `ProjectFiles` boundary is indifferent to it. Note this buys cheaper **fetch**, not cheaper **build** — recompute stays whole-corpus regardless (see below).

## Towards incremental rebuild

Every build today is a full build: `loadContentFromTree` re-parses and re-transforms every page, and the cross-page register → aggregate → post-process pipeline re-runs over the whole corpus. A provider refresh changes which *bytes* are read, never how much of the pipeline re-runs.

That is deliberate. The seam is a **prerequisite** for per-file incremental rebuild, not a delivery of it: by centralizing I/O through one choke point, wrapping it with `recordingProjectFiles(inner, onRead)` captures a page's dependency read-set for free. {% ref "ADR-025" /%} records the target architecture — dependency-tracked invalidation with the registry as the firewall — that this recordable seam unlocks. The engine itself is a separate, future spec.

## Checklist for plugin authors

- Read project files through the context's provider (`ctx.sandbox` in preprocess, `projectFiles` in `configure`), not `node:fs`.
- Treat a `null` / `[]` / `false` result as "absent or denied" — don't try to distinguish containment failures; the provider owns that decision.
- Keep an `fs` fallback only where a path can legitimately live outside the project root (e.g. plugin partial directories in `node_modules`).
- If your hook needs whole-corpus data, that's the [cross-page pipeline](/extend/plugin-authoring/pipeline) — `ProjectFiles` is for per-file reads.
