{% work id="WORK-354" status="draft" priority="low" complexity="moderate" source="SPEC-085" tags="bento,responsive,authoring,future" %}

# Responsive per-cell bento spans

Deferred granular follow-on to the bento collapse model ({% ref "WORK-348" /%}).
Once grid-level `collapse` + automatic progressive reduction are in place, the
remaining need is *per-cell* responsive control — letting an individual tile
declare its span per breakpoint.

## Why deferred / why not per-cell `collapse`

Grid-level `collapse` + `min(span, columns)` auto-capping cover the common cases.
A per-cell **`collapse="lg"`** was considered and rejected: cells collapsing at
*different* breakpoints produce ragged intermediate layouts (one tile full-width
while neighbours are still multi-up → holes the auto-placer fills awkwardly). The
coherent primitive is **responsive spans** — each cell knowing its exact width at
each step — but that is a larger syntax feature with no concrete demand yet.

## Sketch (finalize on demand)
- A per-cell responsive span syntax, e.g. `cols="4 lg:2 sm:full"` (Tailwind-style
  `col-span-4 lg:col-span-2`), resolving to breakpoint-scoped `grid-column` spans;
  optionally `rows` too.
- Stays coherent (no raggedness) because every cell declares its own width at each
  breakpoint, rather than an opaque collapse trigger.
- Composes with the grid-level `collapse` (which still sets the final stack point).

## Acceptance Criteria (when scoped)
- [ ] A per-cell responsive span syntax parses to breakpoint-scoped column (and optional row) spans.
- [ ] It composes with grid-level `collapse` and the auto-cap, without raggedness.
- [ ] Documented; tests cover a multi-breakpoint cell.

## References
- {% ref "WORK-348" /%} (grid-level collapse + auto reduction), {% ref "SPEC-085" /%}

{% /work %}
