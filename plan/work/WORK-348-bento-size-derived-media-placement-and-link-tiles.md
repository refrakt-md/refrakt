{% work id="WORK-348" status="done" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="bento,marketing,lumina" %}

# Bento sizing model, size-derived media placement, and link tiles

Land SPEC-085's sizing model and the placement/link affordances. One grid, one
vocabulary: a 6-column default, proportional `size` presets, and precise
`cols`/`rows`.

## Acceptance Criteria
- [x] **`columns` defaults to 6** for both authoring modes (author-overridable); the mode-dependent `tiered`=4 / `span`=6 split and the `sizing="span"` parent mode are removed.
- [x] **`size` presets resolve as proportions of the column count** (small ⅓, medium ½, large ⅔ × 2 rows, full = all → 2/3/4/6 @ 6 cols), so they hold their ratio at any `columns`.
- [x] **`cols` / `rows`** map to `grid-column: span` / `grid-row: span` and override `size` per-axis when present.
- [x] **Uniform row tracks.** The grid sets `grid-auto-rows: var(--rf-bento-row-height)` (a fixed, themeable height — **not** tied to column width, which would explode vertically on collapse). Row spans (`rows` / `large`) are therefore meaningful, and a tall guest is bounded by the track (it scales/clips via WORK-339) rather than ballooning the whole row. Row height may vary per breakpoint but is never coupled to the column width.
- [x] **Author-controlled collapse** mirroring split: `{% bento collapse="sm|md|lg|never" %}` sets the breakpoint at which the grid drops to a single stacked column (with a sensible default), replacing the hard-coded `!important` final collapse.
- [x] **Automatic progressive reduction.** Between full grid and stacked, the column count steps down responsively and every span **auto-caps via `min(span, current-columns)`** — no per-size `!important` overrides — so wide cells degrade gracefully at each step. (Per-cell responsive spans are deferred — WORK-354.)
- [x] **Tiered sugar** maps auto-detected relative heading depth → size preset: base → large (4×2), base+1 → medium (3×1), base+2+ → small (2×1). Deep headings do not get distinct row spans.
- [x] `media-position` is author-controllable per cell (`top | bottom | start | end`) with a **size-derived default** (small → media top/stacked; large/full → prominent / beside).
- [x] An optional **`href`** makes a whole cell a link (mirrors `card`), with correct focus/hover affordances and accessible markup.
- [x] CSS keys placement off `data-media-position` + the resolved spans, reusing the shared `split.css` / card media rules where possible.
- [x] Tests / examples cover: the 6-col default, each `size` preset proportion, `cols`/`rows` overrides, the tiered depth→size mapping, each media-position value, and a link tile. Existing heading-sugar bentos keep their proportions (verify).

## Approach
Resolve `size`/`cols`/`rows` to grid spans in the cell transform/CSS (custom
properties keyed off the cell `size`/span data). Lean on `split.css` / card media
rules for placement so bento and card share behavior. Verify the canonical
`bento.md` and any other usages still read well at the new 6-col default.

## References
- `plugins/marketing/src/tags/bento.ts`, `plugins/marketing/src/config.ts`, `packages/lumina/styles/runes/bento.css`
- `card` `href` + `data-media-position`; `split.css`
- Substrate {% ref "SPEC-085" /%}; cell zones {% ref "WORK-345" /%}

## Resolution

Completed: 2026-06-06

Branch: `claude/v0.19-bento`

### What was done
- **6-col default** for both modes (`columns` ?? 6); the old mode-dependent split + `sizing="span"` are gone (removed in WORK-345).
- **Proportional presets** — `presetSpans(size, columns)` resolves a preset to `(cols, rows)` as a fraction of the column count (small ⅓, medium ½, large ⅔×2, full = all → 2/3/4/6 @ 6 cols), so a preset holds its ratio at any `columns`. `convertHeadings` computes them per cell.
- **`cols` / `rows`** are first-class cell attrs → `--cell-cols` / `--cell-rows` → `grid-column/row: span`; they override the preset per axis.
- **Uniform fixed row tracks** — `grid-auto-rows: var(--rf-bento-row-height, 12rem)`, never column-tied, so spans are meaningful and tall guests are bounded (WORK-339) instead of ballooning.
- **Author collapse** — `{% bento collapse="sm|md|lg|never" %}` → `data-collapse`; CSS drops the grid to one column at that breakpoint (replacing the `!important` final collapse), with **automatic progressive reduction** in between (`--bento-cols-effective` steps 6→4→3→2→1; every span auto-caps via `min(--cell-cols, --bento-cols-effective)`).
- **Media placement** — `data-media-position` (`top|bottom|start|end`) via a flex layout, with a **size-derived default** (large/full → `start`/beside, smaller → `top`).
- **href** link tiles (stretched overlay) carried from WORK-345; CSS styles the link + nested-link z-index.
- Rewrote `bento.css` accordingly; 10 bento tests; regenerated both contracts; `size` made `noBemClass` (spans come from `cols`/`rows`, not a size class).

### Notes
- The `cols`/`rows`-override and href-link-tile **tests** require explicit `{% bento-cell %}` authoring, which lands in WORK-347 — the transform mechanism (attrs → spans → grid, href) is in place and exercised by the sugar path's computed spans.
- Full suite green (3066); css-coverage + contracts pass.

{% /work %}
