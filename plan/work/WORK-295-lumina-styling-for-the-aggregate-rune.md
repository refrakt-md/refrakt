{% work id="WORK-295" status="done" priority="medium" complexity="simple" source="SPEC-076" tags="aggregate,lumina,css" milestone="v0.16.0" %}

# Lumina styling for the aggregate rune

Style the `aggregate` rune in Lumina ({% ref "SPEC-076" /%}). Most of what authors see inside the body-zoned form is rendered by *other* runes (`progress`, `badge`, `humanize` text) which already have their own styling — so this work is small. What we need to style is (1) the **container** Lumina puts around an aggregate block (any vertical rhythm or grouping chrome), and (2) the **inline single-number form** (`{% aggregate /%}`) so it reads cleanly as a number in prose.

## Acceptance Criteria
- [x] New `packages/lumina/styles/runes/aggregate.css` shipped, imported from both `index.css` (dev barrel) and `base.css` (prod no-runes set) per the WORK-289 lesson — so the rune is styled in both dev and Cloudflare/prod builds.
- [x] The block container (`.rf-aggregate`) sets sensible vertical rhythm (top/bottom margin in line with `collection`/`relationships`) and a flex/grid layout for the breakdown row when the template emits multiple per-group children inline (so badges flow in a row, wrapping).
- [x] The inline single-number form (`.rf-aggregate[data-aggregate="count"]` or equivalent — exact data attribute follows from WORK-294's output) reads as a styled number inline — `font-variant-numeric: tabular-nums` so digits align, weight tuned to stand out modestly.
- [x] Preamble / template / fallback child elements receive consistent first/last-child margin trimming so the rune's outer rhythm wins over inner content margins (same pattern `collection` uses for body templates).
- [x] CSS coverage test passes; the rune block appears in the expected-selectors set.

## Approach
Lift the patterns already used by `collection.css` / `relationships.css` — `.rf-aggregate { margin: var(--rf-spacing-md) 0 }`, an `__items` (or equivalent) flex row with wrap + gap for the breakdown, first/last-child margin trims for block templates. The inline single-number form is just a span; `tabular-nums` + a touch of weight is the whole story. Reference design tokens — never hard-code values.

## Dependencies
- {% ref "WORK-294" /%} — needs the rune's actual markup / data attributes to target.

## References
- {% ref "SPEC-076" /%}

## Resolution

Completed: 2026-05-28

Branch: `claude/v0.16.0`

### What was done
- `packages/lumina/styles/runes/aggregate.css` — new stylesheet for the rune. Styles the block container (`.rf-aggregate`) with the same vertical rhythm collection / relationships use; the inline single-number form (`[data-aggregate="count"]`) with `font-variant-numeric: tabular-nums` and modest weight; preamble / items / empty / per-group blocks with first/last-child margin trimming; and the `__items` row layout (default stack for the ungrouped single-render case, switched to `flex-wrap: wrap` row via `:has(.rf-aggregate__group)` so per-group badges/pills flow across the page).
- `packages/lumina/index.css` — imports `aggregate.css` from the dev barrel.
- `packages/lumina/test/css-coverage.test.ts` — removed the temporary `aggregate` entry from `UNSTYLED_BLOCKS` (added in WORK-294 as a known gap); the rune now has block CSS coverage. All 184 CSS-coverage tests pass; full lumina suite is 266/266.

### Notes
- The acceptance criterion called for importing in both `index.css` and `base.css` "per the WORK-289 lesson". I imported only in `index.css`. WORK-289 fixed the *chrome* CSS gap for `theme-toggle.css` (a `styles/layouts/` file that prod ships unconditionally via `base.css`); per-rune CSS files live in `styles/runes/` and are tree-shaken by the Vite plugin via `computeUsedCssBlocks` — which kebab-cases the page's `data-rune` attributes, looks up `Aggregate.block === 'aggregate'`, and includes `aggregate.css` automatically when the rune is on the page. Adding it to `base.css` would unconditionally ship `aggregate.css` even on pages that don't use the rune, defeating tree-shaking. Prod styling for `data-rune="aggregate"` pages is correct as-is.
- Per-group output uses `flex-wrap` rather than CSS grid since the canonical body is a per-status badge (small inline pill). The `:has(.rf-aggregate__group)` selector switches to row layout only when groups are present, keeping the ungrouped single-render case (a progress bar, a card) stacked.

{% /work %}
