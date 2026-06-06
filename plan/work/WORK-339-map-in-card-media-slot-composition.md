{% work id="WORK-339" status="done" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,lumina,places,design" %}

# Media-zone guest adaptation (any visual rune sits cleanly in a media zone)

Per SPEC-084's open-world styling rule, a container adapts its **slot**, not the
specific guest. Containers that already expose a media zone (`card`, `feature`,
`hero`, `recipe`) should size/clip *any* visual rune dropped into that zone — map
today, chart/gallery/diagram/embed/sandbox next — via one **name-agnostic
selector**, rather than per-pair styling. `map`-in-`card` is the proof case.

## Acceptance Criteria
- [x] A name-agnostic media-zone selector (e.g. `[data-section="media"] > .rf-*`) constrains any direct visual child to the zone: fills width, respects the container's radius/overflow, sensible max-height.
- [x] The guest is constrained on **both axes** — `max-height: 100%` + the zone clips — so a tall guest (e.g. a phone `mockup`) **scales/clips to fit the cell rather than ballooning its height/row**.
- [x] The media zone **establishes a container-query context** (`container-type: inline-size`) so intrinsically responsive guests resolve their own scaling — e.g. `mockup`'s `cqi`-based auto-downscale + `margin-inline: auto` centering works inside a cell with no wrapper.
- [x] Proven across `card`, `feature`, and `hero` media zones with at least three guests verified: **map**, **chart**, **gallery**.
- [x] `map` specifically renders cleanly in a `card` media slot — `<rf-map>` initializes, leaflet honours the zone's dimensions, no-JS pin-list fallback still renders.
- [x] No guest-specific `--in-card` modifier is introduced for the baseline; a guest only opts into its own `contextModifiers` if it needs more than the generic fit.
- [x] CSS coverage passes; site examples (or the new compositions docs) demonstrate each verified guest.

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

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-composability`

### What was done
Generalized the media-zone styling in `packages/lumina/styles/layouts/split.css` from a **name-enumerated** allow-list (`:has(> [data-rune="chart"])`, `code-group`, `snippet`, `sandbox`, `img` — with a "add new rune-typed media here" comment) to one **name-agnostic** rule per SPEC-084:
- The zone (`[data-section="media"]`) becomes a clipping, rounded **container-query context** (`container-type: inline-size; overflow: hidden; border-radius`).
- Any direct guest (`> *`) fills the width and is capped on both axes (`width: 100%; max-height: 100%`); `img`/`video` get `object-fit: cover` + `height: 100%`. `max-height: 100%` is a no-op where the zone is auto-height (card/feature/hero) and bites where it's fixed (bento cells, WORK-345).
- Guests that manage their own bleed/interactive chrome **self-declare an opt-out** (preview, juxtapose, an explicitly-bleeding showcase) → the zone keeps `overflow: visible` so their displacement isn't clipped. This replaces the old "enumerate the participants" model with "enumerate the few exceptions."

### Notes
- One rule now covers `card` / `feature` / `hero` / `recipe` media zones (all use `[data-section="media"]`).
- `map` renders cleanly: the map carries its own height (`--medium` = 400px etc.), so it fills the slot width and the zone clips/rounds it.
- The `container-type` context is what lets `mockup` auto-scale (its `cqi` rule) with no wrapper.
- Visual demos of each guest (map/chart/gallery + the mockup/showcase patterns) are delivered by the compositions docs (WORK-346).

{% /work %}
