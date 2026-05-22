{% spec id="SPEC-061" status="draft" tags="pipeline, content, transform, variables" %}

# Content variable surface — completing `$page`, `$file`, and rationalizing the namespaces

Audit and complete the author-facing Markdoc variable surface exposed by refrakt's content pipeline. The pipeline today exposes `$frontmatter.*`, a partial `$page.*`, and a partial `$file.*` — but `$page.*` is undersized (no `dir`, `slug`, `title`, and the existing `filePath` key is misnamed), and `$file.*` lacks a project-root file path that consumers like the code-file rune need for disk-relative resolution. Extend both namespaces, document the whole public surface clearly, and settle the convention that double-underscore-prefixed variables are pipeline internals.

The page-vs-file split matters: `$page.*` describes the page as a *content artifact* (its place in the content tree, its URL, its slug); `$file.*` describes the source file as a *disk artifact* (where it lives on disk, when it was committed). The two have different roots of reference — `$page.path` is relative to the content directory, `$file.path` is relative to the project root — and consumers reach for whichever frame matches their concern.

The headline motivation is the view-source pattern from {% ref "SPEC-062" /%} (which needs `$file.path` for code-file's project-root-sandboxed resolution), but the rationalization benefits every rune that wants page or file context.

## Problem

The variable surface today is partial and inconsistent.

**The `$page.*` namespace is undersized.** It exposes `url`, `filePath`, and `draft` (`packages/content/src/site.ts:154`). It's missing the keys URL-aware runes actually want: the directory portion, the URL slug, and the page title. Authors have to do string manipulation in Markdoc expressions to derive them — when they're derivable trivially at the pipeline level.

**`$page.filePath` is misnamed.** Every other path-like field in refrakt uses `path` (resolver inputs, file-walker outputs, plan filenames). `filePath` reads as "the path to some file" rather than "this page's path." Renaming aligns with the broader convention and reads more naturally in attribute interpolation.

**`$file.*` lacks a project-root path.** It exposes `created` and `modified` — both about the file as a disk artifact — but not the file's actual disk location. Consumers like the code-file rune ({% ref "SPEC-062" /%}) resolve paths from project root for sandbox enforcement, and need a variable that returns a path in that frame of reference. `$page.path` is content-root-relative (correct for the content artifact framing), so it can't be used directly for code-file's view-source pattern. The two paths exist because there are two valid frames; both need to be exposed.

**The public surface isn't documented.** `$frontmatter.*` and `$file.*` are reachable from any page but only mentioned in scattered docs (`site/content/extend/plugin-authoring/authoring.md`, plan rune docs). New users discovering the variable system have no central reference.

**The internal/public boundary is informal.** Some pipeline-internal variables use `__` prefix (`__source`, `__sourcePath`, `__sandboxReadFile`, `__securityPolicy`, `__icons`), others don't (`headings`, `generatedIds`, `path`, `urls`, `svg`). The current state works but invites accidental collisions — any author writing `{% $headings %}` would get the pipeline's internal heading index.

-----

## Design Principles

**Document what already exists; add only what's missing.** This isn't a redesign; the existing namespaces (`$frontmatter`, `$page`, `$file`) are the right shape. The spec extends `$page.*` and settles naming.

**Variables describe what already exists.** Each variable mirrors data the pipeline already computes per page. No computed-on-demand fields, no side effects. Read-only views into pipeline state.

**One namespace per data source.** `$frontmatter` is raw frontmatter; `$page` is the page as a content artifact (URL, content-relative path, derived bits); `$file` is the source file as a disk artifact (project-relative path, version-control timestamps). Don't blur the boundaries — a frontmatter key bleeding into `$page` via auto-lift would create a debugging nightmare, and a single unified path variable would force every consumer to think about which frame they need.

**Two paths, two frames.** `$page.path` is relative to the content directory because the page lives inside the content tree. `$file.path` is relative to the project root because the file lives on disk. Consumers that care about content position (URL-aware logic, layout cascades, nav scope) reach for `$page.path`; consumers that care about disk location (sandboxed file reads, build-tooling integrations) reach for `$file.path`.

**Per-page injection.** Each page's transform receives a config with that page's variables populated. Layouts and partials rendered as part of that page see the host page's variables, not their own source file's.

**Double-underscore prefix is the public/internal boundary.** Author content sees variables without `__`; pipeline internals use `__`. Settle this as a convention so future additions are unambiguous.

-----

## Current Public Surface (Documented Baseline)

This section captures what's already exposed today. None of it changes; this spec just makes it official.

### `$frontmatter.*`

The complete parsed YAML frontmatter as a flat object. Whatever keys the author writes in the page's frontmatter block are reachable as `$frontmatter.{key}`.

```markdoc
---
title: Auth system
author: Bjorn
description: How authentication works
---

# {% $frontmatter.title %}

Written by {% $frontmatter.author %}.
```

No schema enforced at the variable layer — the frontmatter object reflects exactly what's in the YAML, whatever shape that is. Frontmatter validation (if needed) happens elsewhere (per-rune schemas, registry hooks).

### `$page.*`

Page-level metadata. Currently:

| Key | Type | Meaning |
|-----|------|---------|
| `$page.url` | string | Final URL of the rendered page |
| `$page.filePath` | string | File path relative to content root *(renamed to `$page.path` — see below)* |
| `$page.draft` | boolean | Whether the page is marked draft in frontmatter |

### `$file.*`

File-system and version-control metadata. Describes the source file as a disk artifact.

| Key | Type | Meaning |
|-----|------|---------|
| `$file.created` | string \| undefined | ISO 8601 date (`YYYY-MM-DD`) of file creation. Sourced from git history when available; filesystem stat as fallback. |
| `$file.modified` | string \| undefined | ISO 8601 date (`YYYY-MM-DD`) of last modification. Same source/fallback strategy as `created`. |

Both can be `undefined` for files that aren't in git and whose filesystem stat is unavailable (rare).

Plan runes (`spec`, `work`, `bug`, `decision`, `milestone`) consume `$file.created` and `$file.modified` as automatic defaults for their `created` and `modified` attributes — see `site/content/runes/plan/index.md` for the existing documentation.

`$file.path` (new — see Changes below) joins this namespace, giving consumers a project-root-relative path for the same disk artifact.

-----

## Changes

### 1. Rename `$page.filePath` → `$page.path` (breaking)

`$page.filePath` becomes `$page.path`. The old name is removed (not aliased).

**Rationale:** "path" matches the broader refrakt naming convention (path resolution, file walker, partial paths) and reads more naturally in attribute interpolation (`path=$page.path` reads cleanly; `path=$page.filePath` reads as a typo).

**Breakage:** a grep of `site/content/` and the test corpus shows zero uses of `$page.filePath` in authored content. The only producer is `packages/content/src/site.ts:154`. The rename touches one line of production code. External consumers (users who've started writing `$page.filePath` in their own sites) will need to rename; document in changeset.

### 2. Add `$page.path` (new value, named replacement for `filePath`)

Path relative to content root, POSIX form (forward slashes). Same value as the renamed `filePath`, with one normalization commitment: POSIX-style slashes regardless of host OS.

```
"docs/themes/configuration.md"
```

### 3. Add `$page.dir`

Directory portion of `$page.path`. Useful for "render only on pages in this section" patterns.

```
"docs/themes"
```

For pages at the content root, `$page.dir` is the empty string `""`.

### 4. Add `$page.slug`

Last URL segment of `$page.url`. Useful for slug-based comparisons without writing string manipulation.

```
$page.url = "/docs/themes/configuration"
$page.slug = "configuration"
```

For index pages (`docs/themes/index.md` → `/docs/themes/`), `$page.slug` is the directory name (`"themes"`), matching nav-resolution conventions from {% ref "SPEC-055" /%}.

### 5. Add `$page.title`

The page title, with a fallback strategy:

1. `frontmatter.title` if set
2. Otherwise, the first H1 heading's text content from the AST
3. Otherwise, `undefined`

Why a derived title when `$frontmatter.title` already exists: pages often don't set `title` in frontmatter when the first H1 is the natural source of truth. Forcing every page to also declare frontmatter title would be duplication. `$page.title` is the right surface for "the page's title, however that's authored."

**Scope inside partials and layouts:** partials and layout files rendered as part of a host page see the host page's `$page.title`, not their own. (Same scoping rule as the rest of `$page.*`.)

### 6. Add `$file.path`

Project-root-relative path to the source file. POSIX-normalized (forward slashes regardless of host OS). The disk-frame counterpart to `$page.path`.

```
$page.path = "docs/themes/configuration.md"        # relative to content root
$file.path = "site/content/docs/themes/configuration.md"  # relative to project root
```

Sourced from the file walker, which already tracks the absolute file path for each page during content load. Computing project-root-relative form is `path.relative(projectRoot, absoluteFilePath)` then POSIX normalization.

**Why a separate path instead of normalizing `$page.path` to project-root?** Two reasons:

1. **The two frames have different natural consumers.** URL-aware logic (nav scope, layout cascade, conditional content) cares about position in the content tree; sandboxed file consumers (code-file rune, future build-time include patterns) care about disk location. Forcing one frame on both consumer groups means every consumer needs string manipulation to get into the frame they want.

2. **Markdoc doesn't support string interpolation in attribute values.** Patterns like `path="site/content/$page.path"` don't work — Markdoc resolves variables in attribute *values* but doesn't splice them into surrounding literals. Without a `concat()` helper (which is its own design choice and not currently registered), the only ergonomic path is to provide the variable in the right frame already.

**Use cases:**

```markdoc
{# Code-file from {% ref "SPEC-062" /%} — view-source pattern #}
{% code-file path=$file.path lang="md" /%}

{# Hypothetical future: "edit this page" link to GitHub #}
{% github-edit-link path=$file.path /%}
```

**Scope inside partials and layouts:** like `$page.*`, partials and layouts see the *host page's* `$file.path`, not their own source file's. The transform context is the host page's; partials and layouts inherit it.

-----

## Internal Variable Surface (Out-of-Scope Reference)

Pipeline internals also live in `config.variables`. Author content should treat anything in this list as off-limits — they may be removed, renamed, or restructured without breakage notice.

| Variable | Owner | Purpose |
|----------|-------|---------|
| `__source` | sandbox rune | Raw page source as a string |
| `__sourcePath` | nav rune | Source file path for nav-relative slug resolution |
| `__sandboxReadFile`, `__sandboxListDir`, `__sandboxDirExists` | sandbox rune | Filesystem access hooks |
| `__sandboxExamplesDir` | sandbox rune | Examples directory location |
| `__securityPolicy` | sandbox rune | Resolved security policy |
| `__icons` | icon rune | Icon registry (theme + user) |
| `headings` | toc/nav | Extracted heading index *(missing `__` prefix — see Open Questions)* |
| `generatedIds` | id generator | Shared ID dedup state *(missing `__` prefix)* |
| `path` | image nodes | Page path (overlaps with `$page.path`!) *(missing `__` prefix)* |
| `urls`, `svg` | image/svg nodes | Registries for asset resolution *(missing `__` prefix)* |

**Convention going forward:** all new pipeline-internal variables use `__` prefix. The unprefixed entries above are historical and remain as-is for now; a future cleanup spec can migrate them. Author content writing `{% $headings %}` etc. is in undocumented territory and may break — `$page.*`, `$frontmatter.*`, and `$file.*` are the only stable public namespaces.

-----

## Engine Changes

### Variable population

`packages/content/src/site.ts:151–164` is the populate site. Extend the `contentVariables` object:

```ts
const contentVariables: Record<string, unknown> = {
  ...opts.variables,
  frontmatter,
  page: {
    url: route.url,
    path: posixPath(page.relativePath),           // renamed from filePath, POSIX-normalized
    dir: posixDirname(page.relativePath),         // new
    slug: lastUrlSegment(route.url),              // new
    title: frontmatter.title ?? firstH1(ast),     // new
    draft: route.draft,
  },
  file: {
    path: posixRelative(projectRoot, page.filePath),  // new — project-root-relative, POSIX
    created: fileTimestamps.created,
    modified: fileTimestamps.modified,
  },
  // ...internal variables unchanged
};
```

The `projectRoot` value is the directory containing `refrakt.config.json` — already known to the content loader (it resolved the config). Threading it into `processContentTree` is a small plumbing change.

### First-H1 extraction

`firstH1(ast)` walks the Markdoc AST and returns the text content of the first `heading` node with `level: 1`, or `undefined`. Implementation lives alongside the existing `extractHeadings` helper since both walk the same tree.

### Path normalization

`posixPath(p)` and `posixDirname(p)` convert backslashes to forward slashes for consistent cross-platform output. Use Node's `path.posix.*` where applicable.

### Layout and partial scoping

Layouts and partials are already rendered with the host page's `config.variables` (because they're transformed as part of the host page's render). No additional plumbing needed — the existing per-page transform call site provides the right scope automatically.

-----

## Acceptance Criteria

- [ ] `$page.path` is exposed, replacing `$page.filePath`; POSIX-normalized
- [ ] `$page.filePath` is removed (not aliased)
- [ ] Changeset documents the rename as a breaking change
- [ ] `$page.dir` resolves to the directory portion of `$page.path`; empty string for content-root pages
- [ ] `$page.slug` resolves to the last URL segment of `$page.url`
- [ ] `$page.slug` for index pages resolves to the directory name (not `"index"`)
- [ ] `$page.title` resolves to `$frontmatter.title` when present
- [ ] `$page.title` falls back to the first H1 in the AST when frontmatter title is unset
- [ ] `$page.title` is `undefined` when neither source provides a title
- [ ] `$page.url`, `$page.draft` continue to work (no regression)
- [ ] `$frontmatter.*` access continues to work for all frontmatter keys (no regression)
- [ ] `$file.created`, `$file.modified` continue to work (no regression)
- [ ] `$file.path` resolves to the source file's project-root-relative path, POSIX-normalized
- [ ] `$file.path` and `$page.path` are distinct (different frames of reference); both are documented with examples
- [ ] Project root (config file directory) is threaded into `processContentTree` for `$file.path` computation
- [ ] Variables work in attribute interpolation (`path=$page.path`)
- [ ] Variables work in text interpolation (`{% $page.title %}`)
- [ ] Variables work in conditional tags (`{% if equals($page.dir, "docs") %}`)
- [ ] Partials included into a page see the host page's `$page.*`, not their own file's
- [ ] Layouts cascaded into a page see the host page's `$page.*`, not the layout file's
- [ ] New authoring docs page documents the full public variable surface (`$frontmatter.*`, `$page.*`, `$file.*`) with examples for each variable
- [ ] Authoring docs explicitly explain the page-vs-file frame distinction (content-relative vs project-relative paths)
- [ ] Authoring docs note the `__` prefix convention as the public/internal boundary
- [ ] Test fixture covers each new `$page.*` variable in a `.md` page that interpolates them

-----

## Out of Scope

- **`$site.*` namespace** — site-level metadata (site name, base URL, theme, registered plugins, etc.) is its own future spec. Mentioned here to flag the future direction but no work in this spec.
- **Migrating unprefixed pipeline internals to `__` prefix** — the historical entries (`headings`, `generatedIds`, `path`, `urls`, `svg`) stay as-is. Future cleanup spec can rationalize them. This spec only establishes the convention for new additions.
- **Frontmatter schema validation** — `$frontmatter.*` reflects whatever YAML the author writes. Validation, type coercion, schema enforcement are separate concerns.
- **Computed page variables** (`$page.wordCount`, `$page.readingTime`) — these would require additional computation per page and don't have an obvious consumer yet. Defer.
- **Cross-page variables** (`$page.siblings`, `$page.parent`, `$page.children`) — the cross-page pipeline registers this data into the EntityRegistry but it's not exposed as Markdoc variables. Different concern; would need its own design (when does the data become available? before or after postProcess?).
- **Custom user-defined variables in `refrakt.config.json`** — site-level custom variables (`variables: { foo: "bar" }`) already work via the existing `opts.variables` plumbing. Documenting that surface is part of the docs deliverable above; no new mechanism.
- **`$page.*` access in YAML frontmatter** — frontmatter is parsed before transform; variables don't resolve there. Out of scope.

-----

## Open Questions

**Should the rename of `$page.filePath` be done as a hard break, or with a one-release deprecation alias?** Recommend hard break — usage in the wild is essentially zero (grep of refrakt's own content corpus shows zero matches), and the changeset note is sufficient warning for external sites. A deprecation alias adds permanent surface for a vanishingly rare upgrade case.

**Should `$page.dir` be the path-dir (`"docs/themes"`) or the URL-dir (`"/docs/themes"`)?** Recommend path-dir (no leading slash, matches `$page.path` rather than `$page.url`). URL-dir is derivable; consistent naming with `$page.path` is more important than the slight extra typing.

**For index pages, should `$page.path` be `"docs/themes/index.md"` or `"docs/themes/"`?** Recommend the literal file path (`"docs/themes/index.md"`). It's the file path; the URL form is what `$page.url` gives. Two different views of the page, both consistent within their own namespace.

**Should `$page.title` walk into wrapper runes for the first H1, or only top-level?** Some pages start with a layout-injected hero where the H1 is the hero's title, not a top-level `# Heading`. Recommend walk into runes (depth-first first-match) — matches authors' mental model of "the visible page title."

**What's the right authoring docs home for the variable surface page?** Probably `site/content/extend/variables.md` (alongside the rune-authoring and theme-authoring guides). Currently the variables are mentioned in scattered docs (plugin-authoring, plan rune docs); consolidating into one canonical page is the deliverable.

**Should there be a runtime warning when an author writes `{% $page.unknown %}` (referencing a non-existent variable)?** Markdoc resolves missing variables to `undefined` silently. Adding warnings would catch typos but might be noisy. Defer — improve later if real cases of "I typo'd a variable name and got a blank page" surface.

-----

## References

- {% ref "SPEC-055" /%} — nav slug resolution (URL conventions, slug semantics)
- {% ref "SPEC-062" /%} — code-file rune (primary consumer of `$page.path`)
- `packages/content/src/site.ts:84–164` — current variable population
- `packages/content/src/timestamps.ts` — `$file.*` source
- `site/content/extend/plugin-authoring/authoring.md:181–182` — existing `$file.*` documentation
- `site/content/runes/plan/index.md:83` — existing `$file.*` usage in plan runes

{% /spec %}
