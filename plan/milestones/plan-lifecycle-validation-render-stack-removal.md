{% milestone name="v0.30.0" status="planning" %}

# v0.30.0 — Plan lifecycle validation & render-stack removal

Two threads of plan-tooling hardening that finish work the previous milestones
deliberately left open. First, teach `plan validate` to catch **lifecycle
drift** — statuses that contradict the terminal evidence around them
({% ref "SPEC-119" /%}), the symmetric counterpart to the one-directional
lifecycle checks already in place. Second, complete the {% ref "SPEC-071" /%}
plan-site transition by **removing the bespoke `plan build` / `plan serve`
render stack** that v0.16.0 deprecated but kept alive — a plan site is now an
ordinary refrakt site, so the parallel SSG can go.

## Shape

**Lifecycle-drift validation ({% ref "SPEC-119" /%}).** {% ref "SPEC-049" /%}
gave specs terminal states and `plan status` a `suggestImplemented` hint, but
that hint only surfaces when you run the reporting tool — nothing *fails a
check* when status and reality diverge, so drift accumulates silently (a manual
audit found 38 `draft` specs whose work was 100% `done`). This milestone lands
SPEC-119's **v1 check set** in `plan validate`: the spec-side contradictions
(`spec-status-lag`, `spec-started-in-draft`, `spec-status-ahead`,
`released-in-without-shipped`) and the dependency/milestone ones
(`stale-blocked`, `milestone-complete-with-open-work`). Validate flags
contradictions; `plan status` keeps suggesting opportunities — one shared
predicate so the two never diverge. The v2 (more opinionated) checks are
deferred until v1 proves non-noisy. A one-time cleanup pass clears the existing
drift so the checks land on a clean repo.

**Render-stack removal ({% ref "SPEC-071" /%}).** v0.16.0 rebuilt refrakt's
plan site from `plan/` via `entityRoutes` + `collection` and deprecated
`plan build` / `plan serve`, but deferred deleting them so existing users
weren't broken ({% ref "WORK-273" /%}). With the site approach proven and
shipped, this milestone removes the commands and their private render pipeline
(`render-pipeline.ts` router, `planLayout`, the port-3000 dev server, the
pagefind invocation), keeping the plan runes, register/aggregate hooks, and the
whole authoring CLI intact. Docs move fully to the site approach.

## Sequencing

- **Validation (P1):** {% ref "WORK-513" /%} (spec-status checks + shared
  `suggestImplemented` predicate) → {% ref "WORK-514" /%} (work-dependency +
  milestone checks) → {% ref "WORK-515" /%} (one-time drift cleanup pass over
  `plan/`, blocked by both check items).
- **Removal (P2):** {% ref "WORK-516" /%} (delete `plan build` / `plan serve`
  + the bespoke render stack; a breaking change to `@refrakt-md/plan`).

The two threads are independent and can run in parallel.

{% /milestone %}
