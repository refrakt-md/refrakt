{% work id="WORK-285" status="ready" priority="medium" complexity="moderate" source="ADR-011" tags="progress,runes,lumina" milestone="v0.16.0" %}

# Generic progress rune

A generic, domain-agnostic `progress` rune in `@refrakt-md/runes` — a presentational bar that renders a completion ratio from supplied numbers. Reusable for milestone completion (WORK-281), funding goals, skill levels, etc. The data is always *supplied* (explicit attributes or, for the milestone case, an aggregate the plan plugin writes onto the entity — WORK-281); the rune computes nothing from the registry.

## Acceptance Criteria
- [ ] A `progress` rune ships in `@refrakt-md/runes` (config entry + catalog entry), domain-agnostic and presentational (identity-transform only, no resolver).
- [ ] **Input:** accepts `value`+`max` (primary) and `percent` (alternative); when both are given `value`/`max` wins. The percent is clamped to 0–100; `max` of 0/absent → 0% with no numeric readout (never NaN). Numeric attributes accept variable interpolation (`value=$item.data.progressDone`).
- [ ] **Readout:** a `display` attribute — `fraction` (default when `value`/`max` present → "12/20"), `percent` (→ "60%"), or `none`.
- [ ] **Label:** an optional body is the label (may hold markup); it also feeds `aria-label`. No separate `label` attribute.
- [ ] **Variant:** an optional `variant` (neutral default; `positive`/`caution`/… available). No automatic threshold coloring.
- [ ] **Element + a11y:** a styled `div[role="progressbar"]` with `aria-valuenow`/`aria-valuemin="0"`/`aria-valuemax`; the fill width is driven by `--rf-progress`. (Not the native `<progress>` element — chosen for theming + label support.)
- [ ] **Output contract:** `.rf-progress` → `__label?` + `__value?` + `__track` > `__fill`.
- [ ] Lumina CSS added (lifted/generalized from the existing `.rf-milestone__progress*`, pipeline.ts:714-725); CSS coverage updated.
- [ ] Tests cover value/max → fraction, percent input, `display` variants, clamping, and the zero/empty degradation.

## Scope
`progress` is a pure ratio bar — it does **not** grow a number-only / KPI mode; "big number + label" stays the separate (still-unbuilt) `stat` rune (WORK-005).

## Approach
Presentational rune: the transform emits the bar element with `--rf-progress` set from the computed percent and the accessible attributes; the body becomes `__label`; `display` controls the `__value` readout. CSS generalizes the existing milestone progress styling into `.rf-progress`. No registry access — WORK-281 produces and passes in the milestone's aggregate numbers.

## Dependencies
None for the rune itself. WORK-281 consumes it (and supplies the milestone aggregate).

## References
- {% ref "ADR-011" /%} — progress rollup relocation (the milestone consumer).

{% /work %}
