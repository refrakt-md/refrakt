{% work id="WORK-339" status="ready" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,places,lumina" %}

# Map in card media slot composition

A concrete composition authors want: drop a `map` into a `card`'s media slot
and have it render cleanly as the card's visual. Today a nested `map` doesn't
adapt to the card media zone (sizing, rounding, overflow), so it reads as an
adrift block rather than the card's media.

## Acceptance Criteria
- [ ] A `map` placed in a `card` media slot renders sized/clipped to the media zone (fills width, respects the card's radius and overflow).
- [ ] The adaptation rides a context modifier (e.g. `map --in-card`) or a media-zone selector, per the SPEC-084 contract — not a one-off hack.
- [ ] The `<rf-map>` web component still initializes and the no-JS pin-list fallback still renders inside the card.
- [ ] CSS coverage test passes for the new selector; a site example demonstrates the pattern.

## Approach
Decide whether the adaptation keys off a `contextModifiers: { card: 'in-card' }`
on Map or off the generic `[data-section="media"] .rf-map` media-zone selector.
Prefer the media-zone selector if it generalizes to other media-capable runes;
otherwise a context modifier. Verify the leaflet container honours the zone's
dimensions.

## References
- `plugins/places/src/config.ts`, `packages/lumina/styles/runes/map.css`
- Card media zone: `packages/lumina/styles/runes/card.css`, `packages/lumina/styles/dimensions/sections.css`
- Pattern home: {% ref "SPEC-084" /%}

{% /work %}
