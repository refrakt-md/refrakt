{% work id="WORK-285" status="ready" priority="medium" complexity="moderate" source="ADR-011" tags="progress,runes,lumina" milestone="v0.16.0" %}

# Generic progress rune

A generic, domain-agnostic `progress` rune in `@refrakt-md/runes` — a presentational bar that renders a completion ratio from supplied numbers. Reusable for milestone completion (WORK-281), funding goals, skill levels, etc. The data is always *supplied* (explicit attributes or, for the milestone case, an aggregate the plan plugin writes onto the entity — WORK-281); the rune itself computes nothing from the registry.

> The exact attribute surface, label/value display, and variants are being finalized in discussion — criteria below capture the agreed direction and will be tightened once the shape is settled.

## Acceptance Criteria
- [ ] A `progress` rune ships in `@refrakt-md/runes` (config entry + catalog entry), domain-agnostic.
- [ ] It renders a bar from supplied numbers — `value`/`max` (and/or `percent`) — degrading gracefully when `max` is 0/absent.
- [ ] Output is a clean BEM contract (`.rf-progress` + bar/fill/label elements) with the fill width driven by a CSS custom property (`--rf-progress`), mirroring the existing milestone progress markup (pipeline.ts:714-725).
- [ ] Accessible: appropriate `role="progressbar"` + `aria-valuenow/min/max` (or equivalent).
- [ ] Lumina CSS added; CSS coverage updated.
- [ ] Usable fed by an aggregate field, e.g. `{% progress value=$item.data.progressDone max=$item.data.progressTotal /%}` (the WORK-281 milestone case).
- [ ] Tests cover value/max rendering, percent computation, and the zero/empty degradation.

## Approach
Presentational rune (identity-transform only, no resolver). Schema takes the numeric attributes; the transform emits the bar element with `--rf-progress` set from the computed percent and the accessible attributes. CSS lifts the existing `.rf-milestone__progress*` styling into a generic `.rf-progress` block. No registry access — see WORK-281 for how the milestone's aggregate numbers are produced and passed in.

## Dependencies
None for the rune itself. WORK-281 consumes it (and supplies the milestone aggregate).

## References
- {% ref "ADR-011" /%} — progress rollup relocation (the milestone consumer).

{% /work %}
