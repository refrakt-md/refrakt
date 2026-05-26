{% work id="WORK-285" status="done" priority="medium" complexity="moderate" source="ADR-011" tags="progress,runes,lumina" milestone="v0.16.0" %}

# Generic progress rune

A generic, domain-agnostic `progress` rune in `@refrakt-md/runes` — a presentational bar that renders a completion ratio from supplied numbers. Reusable for milestone completion (WORK-281), funding goals, skill levels, etc. The data is always *supplied* (explicit attributes or, for the milestone case, an aggregate the plan plugin writes onto the entity — WORK-281); the rune computes nothing from the registry.

## Acceptance Criteria
- [x] A `progress` rune ships in `@refrakt-md/runes` (config entry + catalog entry), domain-agnostic and presentational (identity-transform only, no resolver).
- [x] **Input:** accepts `value`+`max` (primary) and `percent` (alternative); when both are given `value`/`max` wins. The percent is clamped to 0–100; `max` of 0/absent → 0% with no numeric readout (never NaN). Numeric attributes accept variable interpolation (`value=$item.data.progressDone`).
- [x] **Readout:** a `display` attribute — `fraction` (default when `value`/`max` present → "12/20"), `percent` (→ "60%"), or `none`.
- [x] **Label:** an optional body is the label (may hold markup); it also feeds `aria-label`. No separate `label` attribute.
- [x] **Variant:** an optional `variant` (neutral default; `positive`/`caution`/… available). No automatic threshold coloring.
- [x] **Element + a11y:** a styled `div[role="progressbar"]` with `aria-valuenow`/`aria-valuemin="0"`/`aria-valuemax`; the fill width is driven by `--rf-progress`. (Not the native `<progress>` element — chosen for theming + label support.)
- [x] **Output contract:** `.rf-progress` → `__label?` + `__value?` + `__track` > `__fill`.
- [x] Lumina CSS added (lifted/generalized from the existing `.rf-milestone__progress*`, pipeline.ts:714-725); CSS coverage updated.
- [x] Tests cover value/max → fraction, percent input, `display` variants, clamping, and the zero/empty degradation.

## Scope
`progress` is a pure ratio bar — it does **not** grow a number-only / KPI mode; "big number + label" stays the separate (still-unbuilt) `stat` rune (WORK-005).

## Approach
Presentational rune: the transform emits the bar element with `--rf-progress` set from the computed percent and the accessible attributes; the body becomes `__label`; `display` controls the `__value` readout. CSS generalizes the existing milestone progress styling into `.rf-progress`. No registry access — WORK-281 produces and passes in the milestone's aggregate numbers.

## Dependencies
None for the rune itself. WORK-281 consumes it (and supplies the milestone aggregate).

## References
- {% ref "ADR-011" /%} — progress rollup relocation (the milestone consumer).

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/runes/src/tags/progress.ts` — presentational `progress` rune. `value`+`max` (primary) or `percent`; clamps 0–100; `max`=0/absent → 0%, never NaN. `display=fraction|percent|none` readout (fraction default with value/max). Optional body → `__label` + `aria-label`. `variant` (default `default`). Sets root `role="progressbar"`, `aria-valuemin/now/max` (value/max when present, else 0–100), and `style="--rf-progress: N%"` on the `Tag` returned by `createComponentRenderable`.
- `packages/runes/src/config.ts` — `Progress: { block: 'progress', modifiers: { variant } }`.
- `packages/runes/src/index.ts` — import + catalog `defineRune`.
- `packages/lumina/styles/runes/progress.css` + import — `.rf-progress` flex bar; `__track`/`__fill` (width from `--rf-progress`), `__label`/`__value`; positive/caution/negative variant fill tints. CSS coverage 104/111.
- `packages/lumina/contracts/structures.json` — regenerated (additive `Progress`).
- `packages/runes/test/progress.test.ts` — value/max fraction, percent input, display variants, clamping/degradation, body label + aria, track/fill present.

### Notes
- Pure identity-transform rune (no resolver). The milestone aggregate that feeds it is WORK-281; this rune computes nothing from the registry. Distinct from the still-unbuilt `stat` rune (WORK-005).

{% /work %}
