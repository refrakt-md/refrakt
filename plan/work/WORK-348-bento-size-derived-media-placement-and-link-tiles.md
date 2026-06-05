{% work id="WORK-348" status="draft" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="bento,marketing,lumina" %}

# Bento sizing model, size-derived media placement, and link tiles

Land SPEC-085's sizing model and the placement/link affordances. One grid, one
vocabulary: a 6-column default, proportional `size` presets, and precise
`cols`/`rows`.

## Acceptance Criteria
- [ ] **`columns` defaults to 6** for both authoring modes (author-overridable); the mode-dependent `tiered`=4 / `span`=6 split and the `sizing="span"` parent mode are removed.
- [ ] **`size` presets resolve as proportions of the column count** (small ⅓, medium ½, large ⅔ × 2 rows, full = all → 2/3/4/6 @ 6 cols), so they hold their ratio at any `columns`.
- [ ] **`cols` / `rows`** map to `grid-column: span` / `grid-row: span` and override `size` per-axis when present.
- [ ] **Uniform row tracks.** The grid sets `grid-auto-rows: var(--rf-bento-row-height)` (a fixed, themeable height — **not** tied to column width, which would explode vertically on collapse). Row spans (`rows` / `large`) are therefore meaningful, and a tall guest is bounded by the track (it scales/clips via WORK-339) rather than ballooning the whole row. Row height may vary per breakpoint but is never coupled to the column width.
- [ ] **Author-controlled collapse** mirroring split: `{% bento collapse="sm|md|lg|never" %}` sets the breakpoint at which the grid drops to a single stacked column (with a sensible default), replacing the hard-coded `!important` final collapse.
- [ ] **Automatic progressive reduction.** Between full grid and stacked, the column count steps down responsively and every span **auto-caps via `min(span, current-columns)`** — no per-size `!important` overrides — so wide cells degrade gracefully at each step. (Per-cell responsive spans are deferred — WORK-354.)
- [ ] **Tiered sugar** maps auto-detected relative heading depth → size preset: base → large (4×2), base+1 → medium (3×1), base+2+ → small (2×1). Deep headings do not get distinct row spans.
- [ ] `media-position` is author-controllable per cell (`top | bottom | start | end`) with a **size-derived default** (small → media top/stacked; large/full → prominent / beside).
- [ ] An optional **`href`** makes a whole cell a link (mirrors `card`), with correct focus/hover affordances and accessible markup.
- [ ] CSS keys placement off `data-media-position` + the resolved spans, reusing the shared `split.css` / card media rules where possible.
- [ ] Tests / examples cover: the 6-col default, each `size` preset proportion, `cols`/`rows` overrides, the tiered depth→size mapping, each media-position value, and a link tile. Existing heading-sugar bentos keep their proportions (verify).

## Approach
Resolve `size`/`cols`/`rows` to grid spans in the cell transform/CSS (custom
properties keyed off the cell `size`/span data). Lean on `split.css` / card media
rules for placement so bento and card share behavior. Verify the canonical
`bento.md` and any other usages still read well at the new 6-col default.

## References
- `plugins/marketing/src/tags/bento.ts`, `plugins/marketing/src/config.ts`, `packages/lumina/styles/runes/bento.css`
- `card` `href` + `data-media-position`; `split.css`
- Substrate {% ref "SPEC-085" /%}; cell zones {% ref "WORK-345" /%}

{% /work %}
