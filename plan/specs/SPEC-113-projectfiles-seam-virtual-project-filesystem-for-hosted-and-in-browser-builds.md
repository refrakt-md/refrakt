{% spec id="SPEC-113" status="draft" tags="content,runes,pipeline,hosted,security,architecture" %}

# ProjectFiles seam — virtual project filesystem for hosted and in-browser builds

The hosted refrakt product (a GitHub app that renders a tenant's repo on push)
never touches a local filesystem — content arrives from the GitHub API. The
pipeline is already most of the way there: `loadContentFromTree()` runs the full
transform + cross-page pipeline from a caller-assembled `ContentTree`, and the
core packages (transform, runes, svelte, behaviors) are fs-free. What remains is
a handful of **ad-hoc filesystem seams at the edges** — sandbox example reads,
the snippet/expand/file-ref readers, `fileRoots` scanning, the plan plugin's
scan — each with its own injection story (or none). This spec consolidates them
into one injectable **`ProjectFiles`** interface with filesystem and in-memory
providers, defines the **fetch-then-build materialization contract** for remote
sources, and closes the sandbox `src` path-traversal gap as part of the
migration.

## Overview

### What is already virtual (verified against the code)

- **`loadContentFromTree(tree, options)`** (`packages/content/src/site.ts`) — the
  page corpus, partials, and layouts come from a plain-object `ContentTree`; the
  full transform + register/aggregate/post-process pipeline runs. Its docstring
  already names the use case: "a GitHub fetch, a database, an in-memory authoring
  sandbox."
- **Core packages are pure.** transform/runes/svelte/behaviors operate on strings
  and trees; `node:fs` imports concentrate in `content`, the adapters, the
  editor's server side, and the CLI — none of which a hosted renderer needs (the
  host owns config parsing and brings its own app shell).

### The remaining fs seams (the inventory this spec consolidates)

1. **Sandbox example reads** — injectable today (`SandboxHooks` — `read`/`list`/
   `exists` — on both the transform variables (`__sandboxReadFile` family) and the
   preprocess context), defaulting to null hooks in tree mode. The seam exists;
   it is one of four shapes.
2. **snippet / expand / file-ref reads** — `snippet-pipeline.ts`,
   `expand-pipeline.ts`, and `file-ref-resolve.ts` import `readSnippetFile` /
   `readWholeSandboxedFile` from `packages/runes/src/lib/read-file.ts`, which
   calls `node:fs` directly — even though the preprocess context *also* exposes
   the injectable sandbox hook family (`packages/types/src/pipeline.ts`). The
   readers bypass the seam. This is the main gap.
3. **`fileRoots` scanning** (`packages/content/src/file-roots.ts`) — namespace
   partial roots are scanned with direct fs at load time.
4. **Plan plugin `configure` scan** — `@refrakt-md/plan` scans the plan directory
   with direct fs in its configure hook.
5. **Timestamps** — `processContentTree` accepts an injectable `gitTimestamps`
   map, but `LoadContentFromTreeOptions` doesn't expose it (one-line plumb; a
   remote host supplies timestamps from its source's history API).
6. **Config** (`refract-loader.ts`) — direct fs, deliberately out of scope: a
   hosted product owns config resolution (and its plugin allowlisting) itself.

### The wrong abstraction, rejected up front

An async `read(path): Promise<string>` provider threaded through the pipeline is
the tempting shape — and the codebase has already declined it:
`LoadContentFromTreeOptions.reader?: VirtualReader` is documented as *accepted
but not plumbed*, because Markdoc's transform (and the preprocess phase) is
**synchronous**. Making the pipeline async-capable is a large refactor with no
payoff. The provider boundary belongs **in front of** the pipeline, at
materialization time — not inside it.

## Design

### 1. The `ProjectFiles` interface

One synchronous interface, replacing the four ad-hoc shapes:

```ts
/** Synchronous read access to the project's files, rooted at the project
 *  root. Paths are normalized POSIX, project-root-relative keys — never
 *  absolute, never containing `..` after normalization. */
interface ProjectFiles {
	read(path: string): string | null;
	list(path: string): string[];
	exists(path: string): boolean;
	/** Optional: stat-level data where the provider has it (sizes for
	 *  budget caps; future use). */
}
```

- **Keys, not paths.** The contract is normalized POSIX repo-relative keys.
  Containment is part of the interface contract: implementations reject
  absolute paths and any path that escapes the root after normalization —
  callers never re-implement containment.
- Lives in `@refrakt-md/types` (the foundational package), so `runes`,
  `content`, and plugins can all consume it without new dependency edges.

### 2. Providers

- **`fsProjectFiles(rootDir)`** — the OSS/CLI default. Wraps `node:fs` with the
  containment rules `read-file.ts` already implements for snippets
  (absolute-path reject, traversal reject, symlink-escape reject) — promoted
  from snippet-specific code to the provider, so *every* consumer gets it.
- **`memoryProjectFiles(files: Map<string, string>)`** — the hosted/editor
  provider. Backed by a plain map of normalized keys; traversal is structurally
  impossible (lookups are dictionary keys, and the dictionary contains exactly
  one project). `list` is derived from key prefixes.

### 3. Consumer migration

All file-touching consumers read through an injected `ProjectFiles`:

- **Sandbox examples** — the `__sandboxReadFile` family and the preprocess
  `sandbox` hooks become a `ProjectFiles` (the hook shape is already identical;
  this is a rename + containment upgrade). The `src` directory join in
  `packages/runes/src/tags/sandbox.ts` (`examplesDir + '/' + src` — currently
  unguarded string concat) goes through the provider and inherits containment,
  closing the path-traversal gap in fs mode.
- **snippet / expand / file-ref** — `read-file.ts` keeps its line-slicing and
  diagnostics but delegates I/O to the provider instead of `node:fs`; its
  containment logic moves into `fsProjectFiles`.
- **`fileRoots`** — scanned through the provider.
- **Plan plugin** — the configure-time scan accepts a provider from the
  pipeline context (hosted deployments that don't build plan sites can simply
  not provide plan content).
- **`loadContent` (fs mode)** constructs `fsProjectFiles(projectRoot)` and
  threads it — existing behaviour, now with uniform containment.
  **`loadContentFromTree`** accepts `projectFiles?: ProjectFiles` and exposes
  `gitTimestamps` (the missing plumb).

### 4. Fetch-then-build — the materialization contract for remote sources

For the hosted product (and any remote source), the provider is *materialized*
before the build, keeping the pipeline synchronous:

1. Webhook push → fetch the repo **tarball at the commit SHA** — one API call,
   an atomic snapshot (no torn reads across a push), rate-limit-friendly versus
   per-file contents calls.
2. Unpack to a `Map<string, string>` of normalized keys (binary assets are the
   host's concern — served from its storage/CDN, not the pipeline's).
3. Assemble the `ContentTree` from the map (content dir traversal is key-prefix
   filtering); supply timestamps from the source's history API if desired.
4. `memoryProjectFiles(map)` + `loadContentFromTree(tree, { projectFiles, … })`.

The GitHub specifics (App auth, tarball endpoint, webhook handling) belong to
the hosted product's repo; this spec's deliverable is that **steps 3–4 are the
entire integration surface** — no fs, no traversal surface, no async plumbing.

### 5. Non-goals

- **No async pipeline.** `VirtualReader` stays reserved/unused; if a future
  consumer genuinely needs on-demand async resolution, that's its own spec.
- **No config abstraction.** `refract-loader` stays fs-based for OSS; hosts own
  config.
- **No adapter changes.** The sveltekit/eleventy/next adapters remain fs-bound —
  they serve the self-hosted path; a hosted renderer consumes
  `@refrakt-md/content` + the renderer directly.

## Acceptance Criteria

- [ ] `ProjectFiles` (read/list/exists over normalized POSIX project-relative keys, containment as interface contract) is defined in `@refrakt-md/types`, with `fsProjectFiles` (containment: absolute reject, traversal reject, symlink-escape reject — promoted from `read-file.ts`) and `memoryProjectFiles` (map-backed) providers.
- [ ] Sandbox example resolution (transform `__sandboxReadFile` family + preprocess hooks) consumes `ProjectFiles`; the sandbox `src` directory join inherits containment — `{% sandbox src="../…" %}` resolves to the in-band error message, with a regression test, in both providers.
- [ ] snippet / expand / file-ref readers delegate I/O to the provider (line-slicing and diagnostics unchanged); their existing sandbox tests pass against both providers.
- [ ] `fileRoots` scanning and the plan plugin's configure scan read through the provider.
- [ ] `loadContentFromTree` accepts `projectFiles` and `gitTimestamps`; a full site build from a pure in-memory map (no fs access) is covered by an integration test — pages, partials, layouts, a `src`-directory sandbox, and a snippet all resolve.
- [ ] `loadContent` (fs mode) behaviour is unchanged for well-formed projects (existing test suites green); the only behavioural change is containment on previously unguarded paths.
- [ ] Docs: plugin-authoring / adapter docs describe the `ProjectFiles` contract and the fetch-then-build materialization pattern for remote hosts.

## Work breakdown (provisional)

1. **Interface + providers** — `ProjectFiles` in types; `fsProjectFiles` (containment promoted from `read-file.ts`) + `memoryProjectFiles`; unit tests incl. traversal/symlink cases.
2. **Sandbox consumer migration** — hook family → provider; `src` join containment + regression test.
3. **snippet/expand/file-ref migration** — `read-file.ts` delegates I/O; tests against both providers.
4. **`fileRoots` + plan scan + `loadContentFromTree` plumbs** (`projectFiles`, `gitTimestamps`); the in-memory full-build integration test.
5. **Docs** — contract + materialization pattern.

## References

- Virtual entry point + reserved async reader: `packages/content/src/site.ts` (`loadContentFromTree`, `VirtualReader`).
- Existing seams: sandbox hooks (`packages/content/src/site.ts`, `packages/types/src/pipeline.ts` preprocess context); snippet containment model `packages/runes/src/lib/read-file.ts`; `packages/content/src/file-roots.ts`.
- The unguarded join this fixes: `packages/runes/src/tags/sandbox.ts` (`examplesDir + '/' + src`).
- Security context: `SecurityPolicy` tiers (`packages/types/src/security.ts`) govern *client-side* sandbox content; this spec governs *build-time* file access — the two are complementary halves of the hosted threat model.
- Related: {% ref "SPEC-093" /%} (data-bound sandbox — build-time resolution that stays fs-free); {% ref "SPEC-101" /%} (the sandbox-backdrop work that surfaced the hosted questions).

{% /spec %}
