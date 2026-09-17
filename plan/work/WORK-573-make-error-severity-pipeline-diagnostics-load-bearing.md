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

## Scope: the exit-code half only

This item originally carried two independent changes. The visibility half —
the dev server showing nothing, and the per-adapter reporting that
{% ref "SPEC-135" /%} D5 collapses into a single seam — is now
{% ref "WORK-575" /%}, sourced to {% ref "SPEC-135" /%}.

They were split because only one of them is contentious. Making diagnostics
*visible* changes nothing for any consumer; making a build *fail* changes
behaviour for every downstream adapter. Bundled, the uncontroversial half
inherited the other's review burden — which is what this item's own Approach
already said when it told you to "do the second even if the first is rejected".

What stays here: the exit code, its opt-out, and the docs that describe the
consequence.

{% ref "SPEC-135" /%} D4 also removes the urgency. A pre-merge gate no longer
depends on this item, because `refrakt validate` is a command with its own exit
code and no downstream consumers. Whether a *build* should fail is still a real
question — it is just no longer the only route to catching errors before merge.

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
- [ ] The behaviour is opt-out-able, because a user mid-migration needs to ship — reusing {% ref "WORK-559" /%}'s per-site / per-error-id disable rather than adding a second, coarser switch
- [ ] Every adapter gets the same exit-code behaviour, via the reporter seam {% ref "WORK-575" /%} installs — not by editing six call sites
- [ ] `site/` and `plan-site/` still build green
- [ ] The severity table in `site/content/extend/plugin-authoring/pipeline.md` — written by {% ref "WORK-554" /%} to say "none of them changes the outcome of anything" — is updated to match the new reality

## Approach

`formatPipelineSummary` already computes `errorCount` and every caller discards
the return. Once {% ref "WORK-575" /%} has moved those callers onto a single
reporter at `loadContent`, the change is in one place: surface the count, and
let the build fail on it.

Take the opt-out from {% ref "WORK-559" /%} rather than inventing one. A global
"don't fail" boolean is the kind of switch that gets set during a migration and
never unset; a per-error-id disable is already being built for
{% ref "SPEC-132" /%} and expresses the real intent — *this finding, not yet* —
rather than *all findings, forever*.

## Blocked by

- {% ref "WORK-575" /%} — the reporter seam. Without it this is six adapter call sites; with it, one.

## Notes

**Do not fold this into {% ref "SPEC-132" /%}.** That spec's D3 deliberately
declines to assert that validation fails the build, and it lands its findings as
diagnostics either way. Keeping the two separate is what lets SPEC-132 ship
without inheriting this item's downstream-compatibility argument.

**Know where the failure would land.** The repository has one workflow,
`release.yml`, on push to `main`, and the site build runs inside its deploy
step, gated on `published == 'true'`. So a failing build does not fail a PR
check — there is no PR check — it breaks the **release deploy**, after merge, on
the job that publishes the site. That is loud, but late, and it blocks releases
rather than changes.

This does not argue against the item; it argues for pairing it with somewhere
pre-merge to run. {% ref "SPEC-135" /%} raises that as an open question, and its
`refrakt validate` gives a gate that does not require this item at all.

## References

- {% ref "WORK-554" /%} — the measurement this follows from
- {% ref "WORK-575" /%} — the visibility half, split out of this item; installs the reporter seam this depends on
- {% ref "SPEC-135" /%} — D4 (the CLI is the pre-merge gate, not the build) and D5 (one reporter, not six call sites)
- {% ref "WORK-559" /%} — the per-error-id disable this reuses as its opt-out
- {% ref "SPEC-132" /%} — D3; explicitly defers build-failure semantics to here
- {% ref "SPEC-131" /%} — D6, updated to state that its `ctx.error` is not load-bearing
- {% ref "SPEC-126" /%} — guards that nothing runs
- `packages/content/src/format.ts` — `formatPipelineSummary`, where `errorCount` is computed and dropped
- `packages/sveltekit/src/plugin.ts` — the `isBuild` guard that hides diagnostics in dev

{% /work %}
