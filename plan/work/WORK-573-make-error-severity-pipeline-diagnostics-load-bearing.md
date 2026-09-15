{% work id="WORK-573" status="ready" priority="medium" complexity="moderate" source="WORK-554" tags="pipeline, ci, dx, diagnostics" %}

# Make error-severity pipeline diagnostics load-bearing

{% ref "WORK-554" /%} established, by planting one and observing, that an
`error`-severity `PipelineWarning` causes nothing to happen anywhere:

| Surface | Observed |
|---|---|
| `npm run build` (site/ and plan-site/, via `vite build`) | exit **0** |
| `npm test` (4402 tests) | exit **0** |
| Adapter dev server | summary not printed at all — `packages/sveltekit/src/plugin.ts` returns early on `if (!isBuild)` |

`formatPipelineSummary` counts the errors and prints `✗  Build complete (1 error,
…)` to stderr. Nothing reads that count. This item makes the channel mean
something.

It is filed rather than fixed inside {% ref "WORK-554" /%} because the blast
radius, now measured, is small enough that this is a real option rather than a
research question — but changing a build from "always succeeds" to "can fail" is
a behaviour change for every downstream adapter, and it wants its own review.

## The blast radius is already measured, and it is favourable

Counted on a clean build at the time {% ref "WORK-554" /%} ran:

| Site | error | warning |
|---|---|---|
| `site/` | **0** | 35 |
| `plan-site/` | **0** | 0 |

So flipping errors to fail the build would not break either dogfooded site
today. That is the cheap moment to do it; it gets more expensive as soon as the
first error-severity diagnostic starts firing routinely.

The 35 warnings in `site/` are a separate matter and explicitly **not** in scope
— they are `warning`, and this item does not propose promoting them.

## Acceptance Criteria

- [ ] An error-severity `PipelineWarning` produces a non-zero exit from a production build, on at least the SvelteKit reference adapter
- [ ] The failure names the offending diagnostics rather than only printing a count
- [ ] The behaviour is opt-out-able, because a user mid-migration needs to ship — a config switch, defaulting to failing
- [ ] The dev server's `isBuild` guard is revisited: a dev session currently shows *no* pipeline diagnostics at all, which is the more damaging half of {% ref "WORK-554" /%}'s finding
- [ ] The other adapters (eleventy, astro, nuxt, next, html template) either get the same treatment or the divergence is recorded with a reason
- [ ] `site/` and `plan-site/` still build green
- [ ] The severity table in `site/content/extend/plugin-authoring/pipeline.md` — written by {% ref "WORK-554" /%} to say "none of them changes the outcome of anything" — is updated to match the new reality

## Approach

Two independent halves, and the second is arguably the more valuable:

1. **Exit code on build.** `formatPipelineSummary` already computes `errorCount`.
   The change is at the call sites, which currently discard it.
2. **Dev-server visibility.** The `if (!isBuild) return` guard means a dev server
   swallows every diagnostic. Whatever is decided about exit codes, a developer
   editing content should see the warnings their edit produced.

Do the second even if the first is rejected. A diagnostic nobody can see in the
loop where they are actually working is the {% ref "SPEC-126" /%} disease in its
purest form.

## Notes

**Do not fold this into {% ref "SPEC-132" /%}.** That spec's D3 deliberately
declines to assert that validation fails the build, and it lands its findings as
diagnostics either way. Keeping the two separate is what lets SPEC-132 ship
without inheriting this item's downstream-compatibility argument.

## References

- {% ref "WORK-554" /%} — the measurement this follows from
- {% ref "SPEC-132" /%} — D3; explicitly defers build-failure semantics to here
- {% ref "SPEC-131" /%} — D6, updated to state that its `ctx.error` is not load-bearing
- {% ref "SPEC-126" /%} — guards that nothing runs
- `packages/content/src/format.ts` — `formatPipelineSummary`, where `errorCount` is computed and dropped
- `packages/sveltekit/src/plugin.ts` — the `isBuild` guard that hides diagnostics in dev

{% /work %}
