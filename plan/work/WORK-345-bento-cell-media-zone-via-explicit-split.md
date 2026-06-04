{% work id="WORK-345" status="draft" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="composability,marketing,bento,lumina" %}

# Bento cell adopts card's zone contract

Foundation step for SPEC-085: give `bento-cell` the same zone structure as `card`
instead of its current "icon + one body div." The cell content splits on a
top-level `---` into `data-section="media" / body / footer`, so the WORK-339
media-zone selector styles guests in a cell exactly as in a card, with no
bento-specific media CSS.

## Acceptance Criteria
- [ ] A `bento-cell`'s content splits on top-level `---` into `media` / body / footer zones using `data-section`, matching `card`.
- [ ] A visual rune (chart/map/gallery/diagram/embed/sandbox) in the media zone is sized by the WORK-339 selector, with no bento-specific per-guest CSS.
- [ ] The cell carries `data-media-position` (default `top`) on the same contract as `card`, ready for WORK-348 to drive placement.
- [ ] The existing icon-as-visual path keeps working; the docstring's image/emoji-as-visual claim is reconciled with the code under the new zone model.
- [ ] Heading-driven cells map cleanly onto the zones (heading → headline, content → body, `---` → media); cells without a `---` are unchanged (back-compat).
- [ ] The media zone is a **clipping container** (`overflow: hidden`) so a `showcase` guest can bleed to a partial view; the existing `showcase--in-bento-cell` modifier + `showcase.css` clipping work end-to-end (SPEC-085 signature composition).
- [ ] The cell background is **tint-deferrable** (the cell does not hard-set a background that would defeat `tint`), so a per-cell `{% tint %}` / `tint-mode` paints background + text.
- [ ] Tests cover: a cell with a `---` media split, a guest sized in the media zone, a legacy `---`-less cell, a `showcase` bleed clipped to a cell, and a tinted cell.

## Approach
Reuse `card`'s split logic so the two stay in lockstep. Because cells are
generated from headings (`convertHeadings`), the `---` lands in the heading's
content run and is available to `bentoCell`'s transform. Label zones with
`data-section` and emit `data-media-position` on the cell root.

## References
- `plugins/marketing/src/tags/bento.ts` (bentoCell transform), `plugins/marketing/src/config.ts` (BentoCell)
- `card` split + zones: `packages/runes/src/config.ts` (Card), `card.css`
- Selector from {% ref "WORK-339" /%}; substrate {% ref "SPEC-085" /%}

{% /work %}
