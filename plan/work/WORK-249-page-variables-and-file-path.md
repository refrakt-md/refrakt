{% work id="WORK-249" status="done" priority="high" complexity="moderate" source="SPEC-061" tags="pipeline, content, transform, variables" milestone="v0.15.0" %}

# Page variables and `$file.path`

Extend the author-facing Markdoc variable surface so URL-aware and disk-aware runes can reach the data they need without string manipulation in attribute interpolation. Adds new `$page.*` keys, renames the misnamed `$page.filePath` to `$page.path`, and introduces `$file.path` as the project-root-relative disk-frame counterpart.

This is foundational infrastructure for WORK-255 (snippet rune, which needs `$file.path` for its project-root sandbox) and benefits every future rune that wants page or file context.

## Acceptance Criteria

- [x] `$page.path` is exposed, replacing `$page.filePath`; POSIX-normalized (forward slashes regardless of host OS)
- [x] `$page.filePath` is removed (not aliased)
- [x] Changeset documents the rename as a breaking change
- [x] `$page.dir` resolves to the directory portion of `$page.path`; empty string for content-root pages
- [x] `$page.dir` is POSIX-normalized and has no trailing slash
- [x] `$page.slug` resolves to the last URL segment of `$page.url`
- [x] `$page.slug` for index pages resolves to the directory name (not `"index"`)
- [x] `$page.title` resolves to `$frontmatter.title` when present and non-empty after trimming whitespace
- [x] `$page.title` falls back to the first H1 in the AST when `$frontmatter.title` is absent, empty, or whitespace-only
- [x] `$page.title`'s H1 walk is depth-first and descends into tag (rune) children; the first markdown `heading` node with `level: 1` wins
- [x] `$page.title` is `undefined` when neither source provides a title
- [x] `$file.path` resolves to the source file's project-root-relative path, POSIX-normalized
- [x] `$file.created`, `$file.modified`, `$page.url`, `$page.draft`, `$frontmatter.*` continue to work (no regression)
- [x] Project root (config-file directory) is threaded into `processContentTree` for `$file.path` computation
- [x] Variables work in attribute interpolation (`path=$page.path`), text interpolation (`{% $page.title %}`), and conditional tags (`{% if equals($page.dir, "docs") %}`)
- [x] Partials and layouts included into a page see the host page's `$page.*` / `$file.*`, not their own file's
- [x] Test fixture covers each new variable
- [x] Authoring docs page documents the full public variable surface (`$frontmatter.*`, `$page.*`, `$file.*`) with examples; explicitly explains the page-vs-file frame distinction and the `__` prefix convention

## Approach

Per the spec's Engine Changes section: extend `contentVariables` in `packages/content/src/site.ts` with the new keys, plumb `projectRoot` through `processContentTree` for `$file.path`, and add a `firstH1` helper alongside the existing `extractHeadings` walker. `posixPath`/`posixDirname` helpers normalize the path output; `posixDirname` special-cases the `"."` return from `path.posix.dirname` to `""`.

The breaking rename is a hard break (zero usages of `$page.filePath` in the refrakt corpus or test fixtures); changeset note is the only deprecation aid.

## Dependencies

- None within v0.15.0. Foundation work item.

## References

- {% ref "SPEC-061" /%} — page-variable surface (full spec)
- {% ref "SPEC-062" /%} — snippet rune (primary downstream consumer of `$file.path`)
- `packages/content/src/site.ts:151–164` — current variable population
- `packages/content/src/timestamps.ts` — `$file.*` source

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-1`

### What was done

- **`packages/runes/src/util.ts`** — added `firstH1(node)` walker: depth-first traversal that descends into tag (rune) children and returns the text of the first `heading` node with `level: 1`. Text segments joined with `''` so multi-segment headings like `# Hello **strong** world` produce `"Hello strong world"` rather than double-spaced output. Exported from `@refrakt-md/runes`.
- **`packages/runes/test/util.test.ts`** — seven new unit tests for `firstH1` (top-level H1, multiple H1s, walking into runes, H2 precedence, no-H1, empty doc, multi-segment formatting).
- **`packages/content/src/site.ts`**:
  - Refactored `transformContent` to take a pre-parsed Markdoc AST so the variable-population step can walk for `firstH1` once without parsing twice.
  - Added helpers `posixPath`, `posixDirname`, `posixRelativeFromRoot`, `lastUrlSegment`, `derivePageTitle`.
  - `contentVariables.page` now exposes `url`, `path` (renamed from `filePath`, POSIX-normalized), `dir`, `slug`, `title`, `draft`. `contentVariables.file` adds `path` (project-root-relative, POSIX) alongside the existing `created`/`modified`.
  - `$page.title` resolution: trimmed non-empty frontmatter title wins, else `firstH1(ast)`, else `undefined`.
  - `$page.dir`: POSIX `dirname` with `"."` mapped to `""`.
  - `$page.slug`: last URL segment via `lastUrlSegment`; handles trailing slash and homepage `/` cases.
  - `ProcessContentTreeOptions` and `LoadContentFromTreeOptions` gain `projectRoot?: string`; `loadContent` adds a 9th positional `projectRoot` arg (defaults to `resolve(dirPath, '..')` when omitted).
- **`packages/content/src/loader.ts`** — `SiteLoaderOptions` and `VirtualSiteLoaderOptions` gain `projectRoot?: string`; both `createSiteLoader` and `createVirtualSiteLoader` pass it through.
- **`packages/content/src/refract-loader.ts`** — `createRefraktLoader` passes `configDir` as `projectRoot` (the natural project root). `VirtualRefraktLoaderOptions` gains `projectRoot?: string` and threads it through.
- **`packages/sveltekit/src/plugin.ts`** — passes `resolvedRoot` as the new `projectRoot` argument.
- **`packages/eleventy/src/data.ts`** — passes `process.cwd()` as `projectRoot`.
- **`packages/editor/src/server.ts`** — passes `process.cwd()` as `projectRoot`.
- **`.changeset/page-variables-and-file-path.md`** — minor-version changeset for `@refrakt-md/runes`, `@refrakt-md/content`, and the three adapters, documenting the new variables and the breaking rename.
- **`packages/content/test/fixtures/site/variables.md`** — fixture extended to interpolate the new variables.
- **`packages/content/test/site.test.ts`** — assertions added for `$page.path`, `$page.slug`, `$page.title`, and `$file.path` in the existing variables test.
- **`site/content/extend/variables.md`** — new authoring docs page covering all three public namespaces, the page-vs-file frame distinction, and the `__` prefix convention. Linked from `site/content/extend/index.md`.

### Notes

- **Breaking rename:** `$page.filePath` is removed (hard break, not aliased). The refrakt corpus had zero usages outside the spec/work-item documentation itself; the changeset is the only deprecation aid for external sites.
- **`$page.title` walk semantics:** matches the author mental model ("the visible page title"). Only markdown `heading` AST nodes count — H1 elements that runes emit structurally don't participate in the walk. Authors who want a rune-attribute-driven title to surface as `$page.title` should set `frontmatter.title` (which has precedence anyway).
- **`projectRoot` default:** when omitted by an adapter, `loadContent` falls back to `resolve(dirPath, '..')`. The proper value (the directory containing `refrakt.config.json`) is now threaded by SvelteKit, Eleventy, Editor, and `createRefraktLoader`. Hosts using `loadContentFromTree` directly can pass `projectRoot` on the options bag.
- **Text-node join behavior:** the existing `extractHeadings` joins text parts with `' '` because the output feeds the slugifier. `firstH1` joins with `''` because the output is a human-readable title; the difference is intentional and isolated to each helper.
- **Test note:** one plan-pipeline test (`plugins/plan/test/pipeline.test.ts` — milestone backlog) flaked on a 5s timeout under heavy parallel load; passes cleanly in isolation. Unrelated to this work.

{% /work %}
