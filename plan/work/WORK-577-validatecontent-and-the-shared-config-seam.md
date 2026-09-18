{% work id="WORK-577" status="ready" priority="high" complexity="moderate" milestone="v0.36.0" source="SPEC-135" tags="content, validation, api" %}

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

- [ ] Config construction is extracted from `transformContent` (`site.ts:90-113`) into a function both it and `validateContent` call
- [ ] `transformContent` behaviour is unchanged — same findings, same renderable, for every existing test
- [ ] `validateContent` is exported from `@refrakt-md/content` and accepts a `ContentTree` or a directory path plus options
- [ ] It returns findings with enough context to report them — at least file path, line, severity, error id, message
- [ ] It returns findings, **never** a `Site`, partially populated or otherwise
- [ ] It does not call `router.resolve`, `resolveLayouts`, `resolveTimestamps`, `Markdoc.transform` or `runPipeline`
- [ ] It takes `ValidationSettings` and resolves them through `resolveValidationIds`, rather than reimplementing the dispositions
- [ ] A test asserts `validateContent` and a full `loadContent` produce the same findings for the same site, including on a config with `disableIds` set — the D5a agreement test
- [ ] A timing test demonstrates the fast tier is materially cheaper than a full load on the same site

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

{% /work %}
