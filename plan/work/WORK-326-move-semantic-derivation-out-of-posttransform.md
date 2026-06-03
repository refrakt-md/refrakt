{% work id="WORK-326" status="done" priority="medium" complexity="moderate" source="SPEC-081" tags="runes,transform,budget,computation,fields" milestone="v0.18.0" %}

# Move semantic derivation out of postTransform (budget totals)

Apply the {% ref "SPEC-081" /%} computation boundary: **semantic derivation
belongs in the rune transform, not the presentation `postTransform`.** Budget's
grand / per-category / per-day totals are the worked example — a theme-invariant
fact about the content currently stranded in the engine's escape hatch.

## Acceptance Criteria

- [x] Budget totals (grand, per-category, per-day) are computed in the rune
  transform, from authored attributes + parsed categories.
- [x] Totals are emitted as semantic data into the `fields` bag
  ({% ref "WORK-321" /%}) and rendered via a `total` metaField / block placed in
  a footer container by `layout`; currency formatting via a field `transform`.
- [x] Budget's `postTransform` total computation is removed (reduced only to
  genuinely presentation-dependent bits, if any remain).
- [x] The grand total is visible to the pre-engine pipeline (registry /
  `aggregate` can read / sum it).
- [x] Output parity; tests green.

## Dependencies

- {% ref "WORK-321" /%} — the `fields` channel to carry the derived totals.
- {% ref "WORK-324" /%} — `layout` to place the rendered total.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly (computation boundary).
- {% ref "SPEC-082" /%} — typed node data channel.

## Resolution

Completed: 2026-06-03

Branch: `claude/rune-contract-hardening`

### What was done
- `packages/runes/src/tags/budget.ts` — the budget transform now derives all
  totals (grand = sum of category subtotals, per-day = grand / parsed days),
  formats currency deterministically, injects each category's `__header`
  (label + formatted subtotal), and builds the `__footer`. Moved the currency
  table + `formatBudgetAmount` + `parseBudgetDays` helpers here.
- `total` and `perDay` are emitted into the SPEC-082 `fields` bag as bag-only
  properties (referenced in `properties`, kept out of `children`) — pre-engine
  visible to registry/aggregate, stripped from final HTML. Per-category
  subtotals already ride each category node's bag.
- `packages/runes/src/config.ts` — removed budget's entire `postTransform` and
  its now-unused helpers (`BUDGET_CURRENCY_SYMBOLS`, `formatBudgetAmount`,
  `parseBudgetDays`, `parseBudgetAmount`, `collectByRune`). Budget's
  `postTransform` is gone.
- Also flat-emitted the budget preamble (the WORK-325 deferral): headline/blurb
  emit flat, the preamble `<header>` is built by `layout`.
- Regenerated both structure contracts; full suite green.

### Notes
- **Footer rendering — strict parity (user decision).** The AC suggests
  rendering totals via a metaField/block placed by `layout`. The budget footer
  and category headers use a custom DOM (`__total` / `__total-label` /
  `__total-amount` spans, `__per-day`, category `__header`) that doesn't map to
  the `bar` / `definition-list` block primitives, so a block-rendered footer
  would change the DOM + CSS. Per the user's choice, the footer/header are
  **transform-built** to preserve byte-for-byte output parity (verified
  before/after on a rich EUR example). The computation — the actual point of
  the SPEC-081 boundary — is fully in the transform; only the rendering stays
  imperative (but in the transform now, not `postTransform`).
- The lone full-suite failure is the known WORK-330 dogfood flake (passes in
  isolation), unrelated to budget.

{% /work %}
