{% spec id="SPEC-085" status="draft" tags="bento,composability,marketing,runes" %}

# Bento as a composition substrate

`bento` should be a foundational, versatile rune — driving everything from
marketing magazine sections to dashboards. Today it is heading-only and a cell
has no real structure (only an `icon` is recognized as a visual; everything else
is one undifferentiated body). This spec gives bento a solid foundation by
**converging the cell onto `card`'s zone contract** and offering two authoring
front doors.

## The model: a bento cell is a card in a grid track

A `bento-cell` adopts `card`'s structure rather than inventing its own:

- **Same zones** — `data-section="media" / body / footer`, split from cell content
  by the shared `---` convention (SPEC-084 media-zone contract).
- **Same media placement** — the existing `data-media-position` vocabulary
  (`top | bottom | start | end`), reused verbatim from `card`.
- **Same guest styling** — the name-agnostic media-zone selector ({% ref "WORK-339" /%})
  applies unchanged, so any visual rune (chart, map, gallery, …) sits cleanly.
- **Same link affordance** — an optional `href` makes the whole cell a link.

The cell adds only what is genuinely bento's: **grid placement** (`size` / `span`)
and the **heading sugar**. The payoff is enormous reuse — one zone model, one CSS
dimension surface, one media contract — and a cell that is already
composition-ready.

## Two authoring front doors (no mixing)

A grid is authored one of two ways; they do not mix within a single `bento`:

1. **Heading sugar (default).** `## Title` becomes a cell; size derives from
   heading depth (tiered) or column span. Ergonomic, low-syntax — marketing and
   magazine layouts. (Today's behavior, retained.)
2. **Explicit cells.** A `bento` whose children are `{% bento-cell %}` tags uses
   them directly, short-circuiting heading conversion. Full control per tile:
   `size`, `span`, `media-position`, `href`, and a `---`-split media zone. This is
   the dashboard path.

Detection: if the grid contains explicit `bento-cell` tags, it is explicit-mode;
otherwise headings are converted as today. (Mixing the two in one grid is out of
scope.)

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
- Capability-token composition (SPEC-084 future layer).

## Acceptance Criteria

- [ ] A `bento-cell` exposes `card`'s zone contract: `data-section="media"/body/footer` via `---`, `data-media-position`, optional `href`; the WORK-339 media-zone selector styles guests in a cell unchanged.
- [ ] Explicit `{% bento-cell %}` authoring is first-class and short-circuits heading conversion; heading sugar is unchanged when no explicit cells are present.
- [ ] `media-position` is author-controllable per cell with a size-derived default.
- [ ] The icon-as-visual path and the doc-vs-code image/emoji gap are reconciled under the new zone model.
- [ ] Dashboards and marketing sections are both demonstrable (compositions docs, {% ref "WORK-346" /%}).

## References

- `plugins/marketing/src/tags/bento.ts`, `plugins/marketing/src/config.ts`
- `card` zone model: `packages/runes/src/config.ts` (Card), `packages/lumina/styles/runes/card.css`, `split.css` (`data-media-position`)
- Media-zone contract: {% ref "SPEC-084" /%}
- Realised by {% ref "WORK-345" /%}, {% ref "WORK-347" /%}, {% ref "WORK-348" /%}

{% /spec %}
