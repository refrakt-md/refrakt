{% work id="WORK-295" status="ready" priority="medium" complexity="simple" source="SPEC-076" tags="aggregate,lumina,css" milestone="v0.16.0" %}

# Lumina styling for the aggregate rune

Style the `aggregate` rune in Lumina ({% ref "SPEC-076" /%}). Most of what authors see inside the body-zoned form is rendered by *other* runes (`progress`, `badge`, `humanize` text) which already have their own styling — so this work is small. What we need to style is (1) the **container** Lumina puts around an aggregate block (any vertical rhythm or grouping chrome), and (2) the **inline single-number form** (`{% aggregate /%}`) so it reads cleanly as a number in prose.

## Acceptance Criteria
- [ ] New `packages/lumina/styles/runes/aggregate.css` shipped, imported from both `index.css` (dev barrel) and `base.css` (prod no-runes set) per the WORK-289 lesson — so the rune is styled in both dev and Cloudflare/prod builds.
- [ ] The block container (`.rf-aggregate`) sets sensible vertical rhythm (top/bottom margin in line with `collection`/`relationships`) and a flex/grid layout for the breakdown row when the template emits multiple per-group children inline (so badges flow in a row, wrapping).
- [ ] The inline single-number form (`.rf-aggregate[data-aggregate="count"]` or equivalent — exact data attribute follows from WORK-294's output) reads as a styled number inline — `font-variant-numeric: tabular-nums` so digits align, weight tuned to stand out modestly.
- [ ] Preamble / template / fallback child elements receive consistent first/last-child margin trimming so the rune's outer rhythm wins over inner content margins (same pattern `collection` uses for body templates).
- [ ] CSS coverage test passes; the rune block appears in the expected-selectors set.

## Approach
Lift the patterns already used by `collection.css` / `relationships.css` — `.rf-aggregate { margin: var(--rf-spacing-md) 0 }`, an `__items` (or equivalent) flex row with wrap + gap for the breakdown, first/last-child margin trims for block templates. The inline single-number form is just a span; `tabular-nums` + a touch of weight is the whole story. Reference design tokens — never hard-code values.

## Dependencies
- {% ref "WORK-294" /%} — needs the rune's actual markup / data attributes to target.

## References
- {% ref "SPEC-076" /%}

{% /work %}
