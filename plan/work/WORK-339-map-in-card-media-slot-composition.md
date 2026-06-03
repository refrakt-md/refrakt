{% work id="WORK-339" status="ready" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,places,lumina" %}

# Map in card media slot composition

A concrete composition authors want: drop a `map` into a `card`'s media slot and
have it render cleanly as the card's visual. Per SPEC-084's open-world styling
rule, the **container adapts the slot, not the specific guest** — so the card's
media zone gets a name-agnostic selector that sizes/clips *any* media-capable
child (map today, others later), rather than a `map`-specific `--in-card`
modifier.

## Acceptance Criteria
- [ ] A `map` placed in a `card` media slot renders sized/clipped to the media zone (fills width, respects the card's radius and overflow).
- [ ] The adaptation is a **name-agnostic media-zone selector** (e.g. `[data-section="media"] > *` / the card media zone), not a map-specific context modifier — so other media-capable runes benefit too.
- [ ] The `<rf-map>` web component still initializes and the no-JS pin-list fallback still renders inside the card.
- [ ] CSS coverage passes; a site example demonstrates the pattern.

## Approach
Add the baseline media-zone adaptation in the card / section-dimension CSS so
any direct child of a media zone is constrained to it. Verify the leaflet
container honours the zone's dimensions (height/overflow). Only if `map` needs
something beyond the generic baseline would it opt into its own
`contextModifiers` — preference is the generic path.

## References
- Card media zone: `packages/lumina/styles/runes/card.css`, `packages/lumina/styles/dimensions/sections.css`
- `packages/lumina/styles/runes/map.css`, `plugins/places/src/config.ts`
- Open-world styling rule: {% ref "SPEC-084" /%}

{% /work %}
