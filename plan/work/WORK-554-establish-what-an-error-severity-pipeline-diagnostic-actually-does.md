{% work id="WORK-554" status="done" priority="high" complexity="simple" milestone="v0.34.0" tags="validation, pipeline, ci, dx" %}

# Establish what an error-severity pipeline diagnostic actually does

Two separate proposals now depend on the same unverified assumption: that
`ctx.error(…)` is a *loud* failure. Nobody has established what it does.

`packages/content/src/site.ts:301` gives preprocess hooks `info` / `warn` /
`error`, all three pushing onto one `preprocessWarnings` array that "callers
funnel through the standard pipeline-warnings surface". Whether an
`error`-severity entry then fails a build, fails a test, prints to a console
nobody reads, or is silently collected is **not written down anywhere**, and
both dependent designs assume the strongest reading.

## Why this blocks two things

- {% ref "SPEC-131" /%} D6 routes symbol-resolution failures through the
  existing error-fence path plus `ctx.error`, and calls the result a loud
  failure. If `ctx.error` is not load-bearing, "loud" means "an error fence on
  a page nobody reloaded", and the spec's central guarantee is weaker than it
  claims.
- {% ref "SPEC-132" /%} proposes feeding `Markdoc.validate()` output into that
  same surface. If the surface does not fail anything, wiring validation into
  it produces diagnostics with no consequence — which is precisely the disease
  {% ref "SPEC-126" /%} identified in the two `--check` flags that never run in
  CI.

Answering it costs an afternoon. Getting it wrong costs both specs their main
claim, so it goes first.

## Acceptance Criteria

- [x] The path from `ctx.error` / `ctx.warn` / `ctx.info` to its consumers is traced and written down — every caller of the pipeline-warnings surface, and what each does with severity
- [x] It is established empirically whether an `error`-severity diagnostic fails `npm run build`, fails `npm test`, both, or neither — by planting one and observing, not by reading
- [x] The same is established for the adapter dev server (does it surface, overlay, or swallow?)
- [x] The behaviour is recorded in the pipeline-hooks documentation so the next design does not have to rediscover it
- [x] If error severity turns out not to fail anything, a follow-up is filed for making it do so, with the blast radius measured first — how many error diagnostics does a clean build of `site/` and `plan-site/` currently emit?
- [x] {% ref "SPEC-131" /%} D6 and its open question are updated to state the answer rather than pose it

## Approach

Plant a deliberate `ctx.error` in a preprocess hook, then run in turn:
`npm run build`, `npm test`, and the adapter dev server. Record exit codes and
what appears on stdout in each. Remove the plant.

The blast-radius count matters and should not be skipped. If error diagnostics
are currently inert, some may already be firing on a clean build — turning them
load-bearing would then break the build immediately, which changes it from a
one-line fix into its own piece of work. Better to know that now than to
discover it inside {% ref "SPEC-132" /%}.

## References

- {% ref "SPEC-131" /%} — D6 and its open question depend on the answer
- {% ref "SPEC-132" /%} — proposes routing validation output through this surface
- {% ref "SPEC-126" /%} — established that this repo's guards only work when a test runs them
- `packages/content/src/site.ts:301` — where the three severities are defined

## Resolution

Completed: 2026-09-15

Branch: `claude/milestone-v0-34-0-5zoab0`

### The answer

**An error-severity pipeline diagnostic fails nothing, anywhere.** Established by
planting one (a synthetic `severity: 'error'` `PipelineWarning` pushed at the
funnel point in `packages/content/src/site.ts`), rebuilding `@refrakt-md/content`,
and observing each surface in turn.

| Surface | Exit code | What appeared |
|---|---|---|
| `vite build` in `site/` | **0** | `✗  Build complete (1 error, 35 warnings)` on stderr |
| `vite build` in `plan-site/` | **0** | `✗  Build complete (1 error, 0 warnings)` on stderr |
| `npx vitest run` (361 files, 4402 tests) | **0** | nothing — no test observes the global error count |
| `vite dev` in `site/` | n/a | **nothing at all** — the summary is never printed in dev |

The dev-server result is the sharpest of the four and was not anticipated by the
work item. `packages/sveltekit/src/plugin.ts:171` returns early on
`if (!isBuild) return;`, so `formatPipelineSummary` is a build-only code path.
A developer working in the dev server sees no pipeline diagnostics of any
severity — not a muted version, none.

### The trace (AC 1)

`ctx.error` / `warn` / `info` are defined in two places, both in
`packages/content/src/site.ts`: `makePreprocessCtx` (`:335`, accumulating into
`preprocessWarnings`, funnelled to `warnings` at `:533` as `phase: 'register'`,
`pluginName: '__preprocess__'`) and `makeContextForRegions` (`:600`, pushing
directly as `phase: 'postProcess'`). Both land in the same `warnings` array
surfaced as `Site.pipelineWarnings`.

Every consumer of that array, and what each does with severity:

| Consumer | Severity handling |
|---|---|
| `packages/content/src/format.ts` — `formatPipelineSummary` | Counts `error` and `warning`, picks an icon per severity, prints `✗` vs `✓` in the status line. **Returns a string; decides nothing.** |
| `packages/sveltekit/src/plugin.ts:222` | `process.stderr.write(...)`. Return value discarded. Build-only (`isBuild` guard). |
| `packages/eleventy/src/data.ts:86` | `process.stderr.write(...)`. Discarded. |
| `packages/next/src/tokens.ts:86` | `process.stderr.write(...)` inside a floating `void import(...).then(...)`. Discarded. |
| `packages/astro/src/integration.ts:75` | `process.stderr.write(...)`, once per build. Discarded. |
| `packages/nuxt/src/module.ts:70` | `process.stderr.write(...)`, once per build. Discarded. |
| `packages/create-refrakt/template-html/build.ts:130` | `process.stderr.write(...)`. Discarded. |
| `packages/content/test/plan-site-dogfood-real.test.ts:127` | The **only** consumer that asserts. Filters `severity === 'error' && phase !== 'register'` and expects `[]`. |

That last row is worth stating plainly: the single assertion in the repo
explicitly excludes `phase: 'register'` — which is exactly the phase every
preprocess-originated error is funnelled into. So the one guard that exists
would not have caught the plant either.

`errorCount` is computed in `format.ts:42` and never read outside the string it
formats. No caller inspects it, sets `process.exitCode`, throws, or fails a task.

### Blast radius on a clean build (AC 5)

Measured with the plant removed:

| Site | error | warning |
|---|---|---|
| `site/` | **0** | 35 |
| `plan-site/` | **0** | 0 |

Zero pre-existing error diagnostics on either dogfooded site. Making error
severity load-bearing would therefore not break anything today — which is the
argument for doing it soon rather than later, and is recorded in the follow-up.

The 35 warnings in `site/` are `bond`/`xref` unresolved-entity notices, one
`file-ref` line-range clamp and one sandbox record-cap truncation. All
`warning`, none proposed for promotion.

### What was done

- `site/content/extend/plugin-authoring/pipeline.md` — added a **"What each
  severity actually does"** subsection under `PipelineContext` carrying the
  measured table, plus a note under **Error Handling** spelling out that a
  caught hook error is likewise downgraded to a stderr line (and to nothing in
  dev).
- `plan/specs/SPEC-131-...md` — D6 rewritten to state the answer. Its guarantee
  is now attributed to the error *fence* (visible on the page) rather than to
  the `ctx.error`, which is the half that actually holds. The matching open
  question is struck through and marked answered.
- `plan/work/WORK-573-...md` — filed: make error-severity diagnostics
  load-bearing. Carries the blast-radius numbers above so the next person does
  not re-measure, and splits the work into the exit-code half and the
  dev-server-visibility half (recommending the second regardless).

### Notes

**The plant was removed.** `packages/content/src/site.ts` is unchanged by this
item; the diff is documentation and plan content only.

**This does not block {% ref "SPEC-132" /%}, it calibrates it.** The spec's D3
already declined to assert that validation fails the build, and WORK-556 lands
findings as diagnostics either way. What changes is the honesty of the framing:
phase 1 ships a reporting channel whose consequence is a line on stderr during
builds and silence in dev. That is still worth shipping — it is strictly more
than the nothing users get today, and it is what WORK-395's validation rail
consumes — but nobody should describe it as a guard until WORK-573 lands.

{% /work %}
