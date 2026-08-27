---
"@refrakt-md/plan": minor
---

Add lifecycle-drift validation to `plan validate` (SPEC-119).

`plan validate` now flags entities whose status contradicts the terminal
evidence around them — the symmetric counterpart to the existing one-directional
lifecycle checks. New v1 checks:

- `spec-status-lag` (warning) — a pre-implemented spec (`draft`/`review`/
  `accepted`) whose linked work is entirely achieving-terminal.
- `spec-started-in-draft` (info) — a `draft` spec with started work.
- `spec-status-ahead` (warning) — an `implemented`/`shipped` spec with a
  non-terminal linked work item.
- `released-in-without-shipped` (warning) — `released-in` set on a
  non-`shipped` spec (mirror of `shipped-without-release`).
- `stale-blocked` (warning) — a `blocked` work item whose `## Blocked by`
  targets are all achieving-terminal.
- `milestone-complete-with-open-work` (warning) — a `complete` milestone with
  a non-terminal member (replaces `complete-milestone-open-item`, now keyed on
  terminal rather than done/fixed so retired members don't falsely flag).

`plan status`'s `suggestImplemented` hint and validate's `spec-status-lag`
share one predicate, so the suggestion and the warning can never diverge.
`--strict` promotes the new warnings to errors.
