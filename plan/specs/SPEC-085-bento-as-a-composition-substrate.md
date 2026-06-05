{% spec id="SPEC-085" status="draft" tags="bento,composability,marketing,runes" %}

# Bento as a composition substrate

`bento` should be a foundational, versatile rune — driving everything from
marketing magazine sections to dashboards. Today it is heading-only, a cell has
no real structure (only an `icon` is recognized as a visual; everything else is
one undifferentiated body), its sizing vocabulary overlaps confusingly, and it is
modelled as a page-section. This spec gives bento a solid foundation by
**converging the cell onto `card`'s zone contract**, a precise sizing model, and
two clean authoring front doors — and by reducing bento to a pure grid primitive.

## The model: a bento cell is a card in a grid track

A `bento-cell` adopts `card`'s structure rather than inventing its own:

- **Same zones** — `data-section="media" / body / footer`, split from cell content
  by the shared `---` convention (SPEC-084 media-zone contract).
- **Same media placement** — the existing `data-media-position` vocabulary
  (`top | bottom | start | end`), reused verbatim from `card`.
- **Same guest styling** — the name-agnostic media-zone selector ({% ref "WORK-339" /%})
  applies unchanged, so any visual rune (chart, map, gallery, …) sits cleanly.
- **Same link affordance** — an optional `href` makes the whole cell a link.

The cell adds only what is genuinely bento's: **grid placement** and the
**heading sugar**. The payoff is enormous reuse — one zone model, one CSS
dimension surface, one media contract — and a cell that is already
composition-ready.

## Bento is a grid primitive, not a page-section

Bento is **only** a grid of cells; it does **not** carry page-section chrome
(eyebrow / title / blurb). The current `sections` + `pageSectionAutoLabel`
preamble is removed — it forced a bento title to be an `#` h1 (page-title level
inside a section) and consumed the top heading instead of letting it size a cell.

A *titled* bento is a **composition**: wrap it in a page-section rune
(`feature` / `hero` / a section) or put a heading above it. Section chrome belongs
to the section runes; bento supplies the grid. Bento keeps its universal block
dimensions (width / spacing / inset) — those are not tied to the preamble — it
just stops being a `contentSection`.

Consequence: with no preamble eating the top heading, **every heading is a cell**.

## Sizing model

One grid, one vocabulary. The grid defaults to **6 columns** (highly divisible —
halves `3+3`, thirds `2+2+2`, `1+2+3`, `4+2`), the same for both authoring modes,
author-overridable via `columns`.

- **`size`** — a named preset, expressed as a **proportion of the column count**
  so it holds its ratio at any `columns` value:

  | `size` | proportion | @ 6 cols | tiles with |
  |--------|-----------|----------|------------|
  | small | ⅓ | 2 × 1 | small+small+small, small+medium+? |
  | medium | ½ | 3 × 1 | medium+medium |
  | large | ⅔ × 2 rows | 4 × 2 | large+small |
  | full | all | 6 × 1 | — |

  (The widths 2/3/4/6 all tile cleanly into 6.)
- **`cols` / `rows`** — precise per-axis grid spans (`grid-column: span cols;
  grid-row: span rows`). Fully expressive (any W×H). Override `size` per-axis when
  both are present (`size="large" rows="3"` → 4 cols × 3 rows).

The old `span` cell attribute and the parent `sizing="span"` mode are **removed**
— `span` is subsumed by `cols`, and the per-cell column control it provided now
lives in `cols`/`rows`. (No content uses explicit cells today, so this is a free
cleanup, not a migration.)

### Tiered heading → size (sugar)

In the heading-sugar path, the **input heading level controls tile size only**.
The base level is **auto-detected** (the shallowest heading present), and relative
depth maps to a size preset:

| heading (relative) | size preset | @ 6 cols |
|--------------------|-------------|----------|
| base (e.g. h2) | large | 4 × 2 |
| base + 1 (h3) | medium | 3 × 1 |
| base + 2 and deeper (h4–h6) | small | 2 × 1 |

Three coarse tiers are deliberate — heading depth is a blunt signal; finer or
taller layouts are what explicit `cols`/`rows` cells are for. (Differentiating
deep headings by *row span* is explicitly rejected: rows = height = prominence,
so it would invert the hierarchy, and `small` is already at the 1-row floor.)

### Titles are uniform, not scaled by input level

A cell title renders as a **real heading at one uniform, auto-detected outline
level** (cells are siblings in the grid), with **uniform visual size** via the
`headline` zone typography — never the global h2/h3/h4 type scale. The input
heading level is consumed purely for sizing and is *not* reflected in the rendered
title's level or size. (Today the title is emitted as a bare `<span>`, invisible
to the document outline / TOC; promoting it to a uniform heading is an
accessibility upgrade, and it falls out of the card-zone `headline` for free.)

## Two authoring front doors (no mixing)

A grid is authored one of two ways; they do not mix within a single `bento`:

1. **Heading sugar (default).** Each heading becomes a cell; its *level* sets the
   tile size (tiered, above), its *text* becomes the cell title. Ergonomic,
   low-syntax — marketing and magazine layouts.
2. **Explicit cells.** A `bento` whose children are `{% bento-cell %}` tags uses
   them directly, short-circuiting heading conversion. Full control per tile:
   `cols`/`rows` (or `size`), `media-position`, `href`, and a `---`-split media
   zone. This is the dashboard path.

Detection: if the grid contains explicit `bento-cell` tags, it is explicit-mode;
otherwise headings are converted. (Mixing the two in one grid is out of scope.)

## Media placement

`media-position` is author-controllable per cell via the shared
`data-media-position` attribute (`top | bottom | start | end`; start/end place the
media beside the body for wide cells). The default is **derived from cell size** —
small cells stack media on top; large/full cells place it prominently / beside —
and the explicit attribute overrides.

## Signature compositions (drive the design + the docs)

Two compositions define the bento "feel" and are first-class demo targets — both
already have partial infrastructure:

- **`showcase` bleed in a cell.** The cell media zone is a **clipping container**
  (`overflow: hidden`), so a `showcase` guest (wrapping an image/mockup/sandbox)
  can bleed/offset to show a *partial, peeking* view — the classic bento
  screenshot-in-the-corner look. `showcase` already declares a
  `bento-cell → in-bento-cell` context modifier, and `showcase.css` already keeps
  the bleed clipped inside bento cells (vs `overflow: visible` elsewhere); this
  just needs the cell's clipping media zone (WORK-345) and end-to-end
  verification.
- **`tint` per cell.** A `{% tint %}` first child (or `tint-mode` attribute) gives
  an individual cell its own background + text colour, so a grid can be
  multi-coloured. `tint` is `parent: '*'` and paints via zero-specificity
  `:where()`, so it works *provided the cell does not hard-set its own
  background* — the cell must defer its background to the tint-bridged token.

These are requirements on the cell structure, not just demos: **the media zone
clips, and the cell background is tint-deferrable.**

## Non-goals

- Mixing heading-sugar and explicit cells in a single grid.
- Literal `card` nesting inside cells — the cell *adopts the same contract*
  (zones / media-position / selector), it does not embed a `card` rune.
- Page-section chrome on bento itself (use composition for a titled section).
- Capability-token composition (SPEC-084 future layer).

## Acceptance Criteria

- [ ] Bento is no longer a page-section: the `sections` preamble (eyebrow/title/blurb) is removed; bento keeps width/spacing/inset block dimensions. A titled bento is documented as a composition (wrap in `feature`/section).
- [ ] A `bento-cell` exposes `card`'s zone contract: `data-section="media"/body/footer` via `---`, `data-media-position`, optional `href`; the WORK-339 media-zone selector styles guests in a cell unchanged.
- [ ] Sizing: `columns` defaults to **6** for both modes; `size` presets resolve as proportions of the column count; precise `cols`/`rows` per-axis spans are supported and override `size`. The `span` attribute and `sizing="span"` mode are removed.
- [ ] Tiered sugar maps auto-detected relative heading depth → size preset (base=large 4×2, +1=medium 3×1, +2+=small 2×1); the input heading level controls tile size only.
- [ ] Cell titles render as a uniform, auto-detected heading level with uniform visual size (not a `<span>`, not the input level) — contributing to the document outline.
- [ ] Explicit `{% bento-cell %}` authoring is first-class and short-circuits heading conversion; heading sugar is unchanged when no explicit cells are present.
- [ ] The icon-as-visual path and the doc-vs-code image/emoji gap are reconciled under the new zone model; the media zone clips and the cell background is tint-deferrable.
- [ ] Dashboards and marketing sections are both demonstrable (compositions docs, {% ref "WORK-346" /%}).

## References

- `plugins/marketing/src/tags/bento.ts`, `plugins/marketing/src/config.ts`
- `card` zone model: `packages/runes/src/config.ts` (Card), `packages/lumina/styles/runes/card.css`, `split.css` (`data-media-position`)
- Media-zone contract: {% ref "SPEC-084" /%}
- Realised by {% ref "WORK-345" /%}, {% ref "WORK-347" /%}, {% ref "WORK-348" /%}

{% /spec %}
