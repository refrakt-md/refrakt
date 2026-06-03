{% work id="WORK-330" status="ready" priority="low" complexity="simple" tags="testing,flake,ci,content,dogfood" milestone="v0.18.0" %}

# Stabilize the plan-site dogfood test under parallel load

`packages/content/test/plan-site-dogfood-real.test.ts` ("builds a browsable
plan site from refrakt's real `plan/` via entityRoutes + collection") flakes
**under full-suite parallel load** — it failed on most `npm test` runs across the
SPEC-082 work, yet passes reliably in isolation (~5–6s). It is a heavy,
real-file pipeline build (reads the whole `plan/` tree, runs the full content
pipeline), so under vitest's parallel worker pool it appears to hit a timeout or
a shared-resource race rather than a genuine assertion failure.

This is pre-existing and unrelated to any one change — it just became visible
because every SPEC-082 step ran the full suite.

## Acceptance Criteria

- [ ] Root-cause the flake: confirm whether it's a timeout (heavy build starved
  under parallel load) or a shared-resource race (fs / cwd / global state shared
  with other content tests).
- [ ] Fix it so the full `npm test` passes deterministically — e.g. raise this
  test's timeout, mark its file to run in isolation / non-concurrently
  (`pool`/`isolate`/`sequential` config or `describe`-level concurrency off), or
  remove the shared-state coupling.
- [ ] No reduction in coverage — the test still builds the real plan site and
  asserts the same browsable output.
- [ ] Ten consecutive full `npm test` runs are green (or a reasonable
  flake-free bar).

## Notes

- Observed repeatedly during WORK-321..329: full-suite run shows this one file
  failing; `npx vitest run <file>` passes every time. Its isolation passes also
  served as the regression check that the bag-reading register hooks (WORK-328)
  and SEO untangle (WORK-329) didn't break plan registration.

{% /work %}
