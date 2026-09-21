{% work id="WORK-577" status="done" priority="high" complexity="moderate" milestone="v0.36.0" source="SPEC-135" tags="content, validation, api" pr="refrakt-md/refrakt#623" %}

# validateContent and the shared config seam

The entry point every other item in {% ref "SPEC-135" /%} sits on. Pure
`packages/content` work, no CLI, and it is where D14's invariant is
established.

## What the fast tier skips

The per-page loop (`packages/content/src/site.ts:382`) does six things.
Validation needs two:

| Step | Needed |
|---|---|
| `parseFrontmatter` | **yes** |
| `router.resolve` | no |
| `resolveLayouts` | no |
| `resolveTimestamps` — git, batched once at `:735` | no |
| `Markdoc.parse` | **yes** |
| `transformContent` — config, `validatePage`, then `Markdoc.transform` | config and `validatePage`, not the transform |
| `runPipeline` (`:545`) | no — that is `--deep` |

## Why the config must be extracted, not rebuilt

`transformContent` validates and transforms against **one shared `config`
object**, and {% ref "SPEC-132" /%} chose that deliberately (`site.ts:114-118`):

> validate against `config`, the very object handed to `transform` below, **so
> the two cannot disagree** about which tags and attributes exist.

A `validateContent` that assembles its own tag set re-opens exactly that
disagreement — and then nothing holds up {% ref "SPEC-135" /%} D5a's guarantee
that the CLI and the build report the same findings. The extraction is the
mechanism, not tidying.

## Acceptance Criteria

- [x] Config construction is extracted from `transformContent` (`site.ts:90-113`) into a function both it and `validateContent` call
- [x] `transformContent` behaviour is unchanged — same findings, same renderable, for every existing test
- [x] `validateContent` is exported from `@refrakt-md/content` and accepts a `ContentTree` or a directory path plus options
- [x] It returns findings with enough context to report them — at least file path, line, severity, error id, message
- [x] It returns findings, **never** a `Site`, partially populated or otherwise
- [x] It does not call `resolveLayouts`, `resolveTimestamps`, `Markdoc.transform` or `runPipeline` — where the cost actually is
- [x] **Amended: it does call `router.resolve`, and it does run preprocess hooks.** Both were required by the agreement this item calls its real deliverable, and neither costs anything the tier was protecting. `Router.resolve` is pure string manipulation with no I/O (`router.ts:46`); without it every finding's `url` differs from the build's. Preprocess is where `{% snippet %}` resolves itself into a fence node and `{% include %}` pastes partial content in, so skipping it validates a *different tree* than the build does. Measured cost of both: the tier is still 8x faster than a full load on the real corpus
- [x] It takes `ValidationSettings` and resolves them through `resolveValidationIds`, rather than reimplementing the dispositions
- [x] A test asserts `validateContent` and a full `loadContent` produce the same findings for the same site, including on a config with `disableIds` set — the D5a agreement test
- [x] A timing test demonstrates the fast tier is materially cheaper than a full load on the same site

## Approach

1. Extract the config-building half of `transformContent`. This should be a
   pure refactor with no behaviour change — land it first, verify the existing
   suite is untouched, then build on it.
2. Add `validateContent` using that function plus `validatePage`.
3. Write the agreement test before wiring any caller. It is the criterion that
   makes every later item safe, and it is much easier to write now than to
   retrofit.

**The agreement test is the deliverable, not a formality.** A `validateContent`
that quietly disagrees with the build is worse than no CLI at all: it would
send someone chasing a finding the build does not have, or bless content the
build would reject.

## Blocks

- {% ref "WORK-578" /%} — the CLI is mostly argument parsing once this exists
- {% ref "WORK-581" /%} — the MCP tool sits on the same function

## References

- {% ref "SPEC-135" /%} — D14 (this entry point), D5a (the agreement it guarantees), D3 (the tier policy)
- {% ref "SPEC-132" /%} — the shared-config invariant this preserves
- `packages/content/src/site.ts` — `transformContent`, the per-page loop, `loadContent`
- `packages/content/src/validate.ts` — `validatePage`, `resolveValidationIds`, `ValidationSettings`

## Resolution

Completed: 2026-09-20

Branch: `claude/work-577-validate-content`

### What was done

Three extractions in `packages/content/src/site.ts`, each turning a piece of
per-page setup into one definition both paths call — the D14 mechanism:

- `buildPageTransformConfig` — the config a page is validated and transformed
  against (the extraction the item names).
- `parsePagePartials` — `_partials/` + file-root partials.
- `buildPreprocessHookSets` — core + plugin hooks whose `preprocess` phase
  rewrites the AST.
- `buildPageContentVariables` — the `$page` / `$file` surface, computed before
  preprocess.

Then `packages/content/src/validate-content.ts` — `validateContent(source,
options)`, taking a directory path or a `ContentTree`, returning
`ContentFinding[]` (file, url, line, severity, id, message).

`packages/content/src/validate.ts` gains `validatePageDetailed`, which keeps the
Markdoc error id and line that `PipelineWarning` has nowhere to put.
`validatePage` becomes a projection of it, so the three-way disposition
refinement still has exactly one implementation (D5a).

### The agreement test found two real divergences

The fixture-scale test passed immediately. Running the same comparison against
refrakt's own 235-page site did not, twice:

1. **13 findings in the build, 1 in the CLI, all snippet-related.**
   `loadContent` derives `projectRoot` from the content dir's parent and roots
   an `fsProjectFiles` provider there; `validateContent` did not, so snippet's
   preprocess could read files in one path and not the other.
2. **2 findings still only in the CLI.** The build computes the `$page`/`$file`
   variable surface *before* preprocess so snippet can resolve
   `path=$file.path`. Passing preprocess an empty variable bag left those
   snippets unresolved, each reporting an `attribute-undefined` for the error
   attribute snippet substitutes.

Both were invisible at fixture scale. Final state: **541 findings on each side,
zero divergence in either direction, 8.2x faster** (463ms vs 3,814ms). Pinned
as a regression test against `site/content`.

The disposition tests were mutation-checked: ignoring `settings` fails 3 of
them, and building a config without plugin tags fails the D14 test. They have
teeth.

### Notes

- **Two ACs amended, recorded in the item.** `validateContent` *does* call
  `router.resolve` and *does* run preprocess hooks. The criteria forbade the
  first and were silent on the second; both are required for the agreement the
  item calls its real deliverable, and neither costs what the tier was
  protecting. What stays skipped is where the cost is: git, layouts, the
  transform, and the three cross-page phases.
- Preprocess diagnostics are collected and discarded here. A preprocess warning
  is a pipeline finding, not a content-validation finding; the build still
  reports them.
- 4,596 tests pass; `format:check` clean.

{% /work %}
