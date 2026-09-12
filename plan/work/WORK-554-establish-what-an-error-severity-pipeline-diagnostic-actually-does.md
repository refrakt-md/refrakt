{% work id="WORK-554" status="ready" priority="high" complexity="simple" milestone="v0.34.0" tags="validation, pipeline, ci, dx" %}

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

- [ ] The path from `ctx.error` / `ctx.warn` / `ctx.info` to its consumers is traced and written down — every caller of the pipeline-warnings surface, and what each does with severity
- [ ] It is established empirically whether an `error`-severity diagnostic fails `npm run build`, fails `npm test`, both, or neither — by planting one and observing, not by reading
- [ ] The same is established for the adapter dev server (does it surface, overlay, or swallow?)
- [ ] The behaviour is recorded in the pipeline-hooks documentation so the next design does not have to rediscover it
- [ ] If error severity turns out not to fail anything, a follow-up is filed for making it do so, with the blast radius measured first — how many error diagnostics does a clean build of `site/` and `plan-site/` currently emit?
- [ ] {% ref "SPEC-131" /%} D6 and its open question are updated to state the answer rather than pose it

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

{% /work %}
