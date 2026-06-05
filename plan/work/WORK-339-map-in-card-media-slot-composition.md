{% work id="WORK-339" status="ready" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,lumina,places,design" %}

# Media-zone guest adaptation (any visual rune sits cleanly in a media zone)

Per SPEC-084's open-world styling rule, a container adapts its **slot**, not the
specific guest. Containers that already expose a media zone (`card`, `feature`,
`hero`, `recipe`) should size/clip *any* visual rune dropped into that zone — map
today, chart/gallery/diagram/embed/sandbox next — via one **name-agnostic
selector**, rather than per-pair styling. `map`-in-`card` is the proof case.

## Acceptance Criteria
- [ ] A name-agnostic media-zone selector (e.g. `[data-section="media"] > .rf-*`) constrains any direct visual child to the zone: fills width, respects the container's radius/overflow, sensible max-height.
- [ ] The guest is constrained on **both axes** — `max-height: 100%` + the zone clips — so a tall guest (e.g. a phone `mockup`) **scales/clips to fit the cell rather than ballooning its height/row**.
- [ ] The media zone **establishes a container-query context** (`container-type: inline-size`) so intrinsically responsive guests resolve their own scaling — e.g. `mockup`'s `cqi`-based auto-downscale + `margin-inline: auto` centering works inside a cell with no wrapper.
- [ ] Proven across `card`, `feature`, and `hero` media zones with at least three guests verified: **map**, **chart**, **gallery**.
- [ ] `map` specifically renders cleanly in a `card` media slot — `<rf-map>` initializes, leaflet honours the zone's dimensions, no-JS pin-list fallback still renders.
- [ ] No guest-specific `--in-card` modifier is introduced for the baseline; a guest only opts into its own `contextModifiers` if it needs more than the generic fit.
- [ ] CSS coverage passes; site examples (or the new compositions docs) demonstrate each verified guest.

## Approach
Add the baseline adaptation in the section-dimension / container CSS so any direct
child of a media zone is constrained. Verify the web-component guests (`map`,
`sandbox`) honour the zone box. Bento needs a media zone *introduced* first — that
is its own item (WORK-345) — so this item targets the containers that
already have one.

## References
- `packages/lumina/styles/dimensions/sections.css` (`[data-section="media"]`), `card.css`, `feature`/`hero` media
- `plugins/places/src/config.ts`, `packages/lumina/styles/runes/map.css`
- Open-world styling rule: {% ref "SPEC-084" /%}; catalogued in WORK-346

{% /work %}
