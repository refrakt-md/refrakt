---
"@refrakt-md/plan": minor
"@refrakt-md/lumina": patch
---

Decompose `plan-progress` into sugar over the `aggregate` rune (SPEC-076). It now
composes **one aggregate per entity type** — a type heading ("Work", "Specs", …)
above a progress bar labelled with that type's achieved status ("Done",
"Accepted", …) plus a per-status badge row — resolved by the shared
`resolveAggregates`. Mixing types under a single ratio was misleading (work `done`
and bug `fixed` measure different things). Plan defaults are baked in
(`type="work,bug"`, achieved-status per type, `group="status"`, `milestone=`
scoping); the bespoke plan-side render path is removed. A bare `{% plan-progress /%}`
scopes to `work,bug`; widen with `type=`/`show=`. (Per-status badge colour is
deferred — see WORK-357.)
