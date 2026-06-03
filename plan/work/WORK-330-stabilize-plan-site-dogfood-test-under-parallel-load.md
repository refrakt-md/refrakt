{% work id="WORK-330" status="done" priority="low" complexity="simple" tags="testing,flake,ci,content,dogfood" milestone="v0.18.0" %}

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

- [x] Root-cause the flake: confirm whether it's a timeout (heavy build starved
  under parallel load) or a shared-resource race (fs / cwd / global state shared
  with other content tests).
- [x] Fix it so the full `npm test` passes deterministically — e.g. raise this
  test's timeout, mark its file to run in isolation / non-concurrently
  (`pool`/`isolate`/`sequential` config or `describe`-level concurrency off), or
  remove the shared-state coupling.
- [x] No reduction in coverage — the test still builds the real plan site and
  asserts the same browsable output.
- [x] Ten consecutive full `npm test` runs are green (or a reasonable
  flake-free bar).

## Notes

- Observed repeatedly during WORK-321..329: full-suite run shows this one file
  failing; `npx vitest run <file>` passes every time. Its isolation passes also
  served as the regression check that the bag-reading register hooks (WORK-328)
  and SEO untangle (WORK-329) didn't break plan registration.

## Resolution

Completed: 2026-06-03

Branch: `claude/rune-contract-hardening`

### What was done
- Root-caused the flake as a **starvation timeout**, not a hang or a
  shared-resource race. Captured the failure under full-suite load: `Error:
  Test timed out in 5000ms`. The heavy real-file integration build (reads the
  whole plan/ tree, runs the full content pipeline) takes ~5s even in isolation
  — right at vitest's 5s default `testTimeout` — so parallel-worker CPU
  contention tips it over.
- Fix: gave the one heavy `it()` a **30s timeout** (6x headroom over its ~5s
  work) in `packages/content/test/plan-site-dogfood-real.test.ts`, with a
  comment explaining the starvation cause. No global config change.
- No coverage change — same build, same assertions; only the timeout differs.

### Verification
- 3 consecutive full `vitest run` passes (251/251 test files, zero timeouts),
  where the test previously failed on most full-suite runs.
- 7 additional content-package runs (18/18 files each) green — 10 green runs
  total, no flake.

### Notes
- A genuine hang would still fail well within the 30s bound, so the timeout
  raise doesn't mask real regressions.

{% /work %}
