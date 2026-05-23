{% work id="WORK-249" status="ready" priority="high" complexity="moderate" source="SPEC-061" tags="pipeline, content, transform, variables" milestone="v0.15.0" %}

# Page variables and `$file.path`

Extend the author-facing Markdoc variable surface so URL-aware and disk-aware runes can reach the data they need without string manipulation in attribute interpolation. Adds new `$page.*` keys, renames the misnamed `$page.filePath` to `$page.path`, and introduces `$file.path` as the project-root-relative disk-frame counterpart.

This is foundational infrastructure for WORK-255 (snippet rune, which needs `$file.path` for its project-root sandbox) and benefits every future rune that wants page or file context.

## Acceptance Criteria

- [ ] `$page.path` is exposed, replacing `$page.filePath`; POSIX-normalized (forward slashes regardless of host OS)
- [ ] `$page.filePath` is removed (not aliased)
- [ ] Changeset documents the rename as a breaking change
- [ ] `$page.dir` resolves to the directory portion of `$page.path`; empty string for content-root pages
- [ ] `$page.dir` is POSIX-normalized and has no trailing slash
- [ ] `$page.slug` resolves to the last URL segment of `$page.url`
- [ ] `$page.slug` for index pages resolves to the directory name (not `"index"`)
- [ ] `$page.title` resolves to `$frontmatter.title` when present and non-empty after trimming whitespace
- [ ] `$page.title` falls back to the first H1 in the AST when `$frontmatter.title` is absent, empty, or whitespace-only
- [ ] `$page.title`'s H1 walk is depth-first and descends into tag (rune) children; the first markdown `heading` node with `level: 1` wins
- [ ] `$page.title` is `undefined` when neither source provides a title
- [ ] `$file.path` resolves to the source file's project-root-relative path, POSIX-normalized
- [ ] `$file.created`, `$file.modified`, `$page.url`, `$page.draft`, `$frontmatter.*` continue to work (no regression)
- [ ] Project root (config-file directory) is threaded into `processContentTree` for `$file.path` computation
- [ ] Variables work in attribute interpolation (`path=$page.path`), text interpolation (`{% $page.title %}`), and conditional tags (`{% if equals($page.dir, "docs") %}`)
- [ ] Partials and layouts included into a page see the host page's `$page.*` / `$file.*`, not their own file's
- [ ] Test fixture covers each new variable
- [ ] Authoring docs page documents the full public variable surface (`$frontmatter.*`, `$page.*`, `$file.*`) with examples; explicitly explains the page-vs-file frame distinction and the `__` prefix convention

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

{% /work %}
