---
"@refrakt-md/plan": minor
"@refrakt-md/lumina": patch
---

Decompose `plan-progress` into thin sugar over the `aggregate` rune (SPEC-076):
it now lowers to a progress-bar + per-status badge composition resolved by the
shared `resolveAggregates`, with plan defaults baked in (`type="work,bug"`,
`group="status"`, an achieved-status union for the ratio, and `milestone=`
scoping). The bespoke plan-side render path and `plan-progress.css` are removed.
A bare `{% plan-progress /%}` now scopes to the actionable `work,bug` set; widen
with `type=`/`show=`. (Per-status badge colour is deferred to a follow-up — see
WORK-357.)
