{% work id="WORK-345" status="draft" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="composability,marketing,bento,lumina" %}

# Bento cell adopts card's zone contract; bento becomes a grid primitive

Two structural foundations from SPEC-085: give `bento-cell` the same zone
structure as `card`, and stop modelling `bento` as a page-section.

## Acceptance Criteria
- [ ] **Bento is a grid primitive, not a page-section.** Remove the `sections` preamble (eyebrow/title/blurb) + `pageSectionAutoLabel` from the `Bento` config; bento keeps width/spacing/inset block dimensions but is no longer a `contentSection`. With no preamble, **every heading is a cell** (no top heading consumed).
- [ ] A `bento-cell`'s content splits on a top-level `---` into `media` / body / footer zones using `data-section`, matching `card`.
- [ ] A visual rune (chart/map/gallery/diagram/embed/sandbox) in the media zone is sized by the WORK-339 media-zone selector, with no bento-specific per-guest CSS.
- [ ] The media zone is a **clipping container** (`overflow: hidden`) so a `showcase` guest can bleed to a partial view; the existing `showcase--in-bento-cell` modifier + `showcase.css` clipping work end-to-end.
- [ ] The cell background is **tint-deferrable** (the cell does not hard-set a background that would defeat `tint`), so a per-cell `{% tint %}` / `tint-mode` paints background + text.
- [ ] **Cell titles render as a uniform, auto-detected heading level** with uniform visual size (the `headline` zone typography) — not a bare `<span>`, not the input heading level — contributing to the document outline.
- [ ] The cell carries `data-media-position` (default `top`) on the same contract as `card`, ready for WORK-348 to drive placement.
- [ ] The existing icon-as-visual path keeps working; the docstring's image/emoji-as-visual claim is reconciled with the code under the new zone model.
- [ ] Tests cover: bento with no preamble, a cell with a `---` media split, a guest sized in the media zone, a `showcase` bleed clipped to a cell, a tinted cell, and a uniform-level title.

## Approach
Reuse `card`'s split logic so the two stay in lockstep. Drop the page-section
wiring from the `Bento` config (a titled bento is now a composition — wrap in
`feature`/section, documented in WORK-346). Because cells are
generated from headings (`convertHeadings`), the `---` lands in the heading's
content run; label zones with `data-section`, emit `data-media-position`, and
render the title at the auto-detected outline level (refrakt's `headingLevel`
auto-detect).

## References
- `plugins/marketing/src/tags/bento.ts` (bentoCell transform, convertHeadings), `plugins/marketing/src/config.ts` (Bento / BentoCell)
- `card` split + zones: `packages/runes/src/config.ts` (Card), `card.css`
- Selector from {% ref "WORK-339" /%}; substrate {% ref "SPEC-085" /%}

{% /work %}
