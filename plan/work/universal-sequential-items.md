{% work id="WORK-070" status="done" priority="medium" complexity="moderate" tags="transform, lumina, css, dimensions" milestone="v0.9.0" source="SPEC-025" %}

# Universal Sequential Item Styling

> Ref: SPEC-025 (Universal Theming Dimensions — Sequential Items section)

Depends on: WORK-059 (Metadata Structure Entry — for `data-sequence` attribute emission pattern)

## Summary

Implement the universal sequential items dimension: emit `data-sequence` attributes on ordered item containers (`numbered`, `connected`, `plain`) and `data-sequence-direction` for orientation, then write universal Lumina CSS. This replaces 7 independent implementations of numbered counter circles (steps, recipe, howto, track) and connector-line dots (timeline, itinerary, plot linear) with ~8 generic CSS rules.

## Acceptance Criteria

- [x] `RuneConfig` type extended with optional `sequence?: 'numbered' | 'connected' | 'plain'` field in `packages/transform/src/types.ts`
- [x] Identity transform emits `data-sequence` on `<ol>` containers based on rune config
- [x] Identity transform emits `data-sequence-direction` (`vertical` | `horizontal`) when declared
- [x] Lumina CSS: `[data-sequence="numbered"]` rules — counter-reset, counter-increment, positioned circle with `1.5rem` size, `tabular-nums`, primary colour, surface background, full border-radius
- [x] Lumina CSS: `[data-sequence="numbered"] > li + li` separator border
- [x] Lumina CSS: `[data-sequence="connected"]` vertical rules — `border-left` connector line, `0.75rem` dot at each node, transparent border on last item
- [x] Lumina CSS: `[data-sequence="connected"][data-sequence-direction="horizontal"]` rules — `border-top` connector, horizontal flex layout, repositioned dots
- [x] Lumina CSS: `[data-sequence="plain"]` — list-style none, no indicators
- [x] Density interaction: compact shrinks circles/dots and tightens spacing, minimal hides indicators
- [x] Rune configs annotated: Steps (`numbered`), Recipe (`numbered` on steps `<ol>`), HowTo (`numbered` on steps `<ol>`), Track (`numbered`), Timeline (`connected`), Itinerary (`connected`), Plot linear (`connected`)
- [x] Existing per-rune counter/connector CSS identified for future cleanup (not removed yet — additive migration)
- [x] CSS coverage tests updated for all new `[data-sequence]` selectors

## Approach

### Transform layer (`packages/transform/`)

Add `sequence` to `RuneConfig` in `types.ts`. In `engine.ts`, when processing ordered lists within a rune that declares `sequence`, set `data-sequence` and optionally `data-sequence-direction` on the `<ol>` element.

For runes like Timeline that support direction variants (vertical/horizontal), the direction modifier value maps to `data-sequence-direction`.

### Rune config annotations

Add `sequence` declarations to the relevant configs:

- `runes/marketing/src/config.ts` — Steps: `sequence: 'numbered'`
- `runes/learning/src/config.ts` — HowTo, Recipe: `sequence: 'numbered'`
- `runes/media/src/config.ts` — Track (via playlist): `sequence: 'numbered'`
- `runes/business/src/config.ts` — Timeline: `sequence: 'connected'`
- `runes/places/src/config.ts` — Itinerary: `sequence: 'connected'`
- `runes/storytelling/src/config.ts` — Plot: `sequence: 'connected'` (linear variant only — may need conditional logic or a postTransform to set based on layout modifier)

### Lumina CSS (`packages/lumina/styles/dimensions/sequence.css`)

Write ~8 rules matching the CSS in SPEC-025's Sequential Items section. Import in `packages/lumina/index.css`. The numbered circle values (1.5rem, 0.75rem font, tabular-nums, primary colour, surface background, full radius) are taken directly from the existing duplicated CSS in steps.css, recipe.css, howto.css. The connected dot values (0.75rem, 2px border, double box-shadow) are taken from timeline.css and itinerary.css.

### Migration notes

This is additive — existing BEM classes and per-rune CSS continue to work. The universal rules layer underneath. In a follow-up cleanup pass, the per-rune counter/connector CSS (~15 lines per rune × 7 runes ≈ 105 lines) can be removed once the universal rules are verified.

## References

- {% ref "SPEC-025" /%} (Universal Theming Dimensions — Sequential Items section)
- {% ref "WORK-067" /%} (Lumina Universal Dimension CSS — sibling work item)
- {% ref "WORK-069" /%} (Universal Checklist Styling — sibling pattern)

{% /work %}
