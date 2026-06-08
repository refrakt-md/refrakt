{% work id="WORK-345" status="done" priority="medium" complexity="moderate" source="SPEC-085" milestone="v0.19.0" tags="composability,marketing,bento,lumina" %}

# Bento cell adopts card's zone contract; bento becomes a grid primitive

Two structural foundations from SPEC-085: give `bento-cell` the same zone
structure as `card`, and stop modelling `bento` as a page-section.

## Acceptance Criteria
- [x] **Bento is a grid primitive, not a page-section.** Remove the `sections` preamble (eyebrow/title/blurb) + `pageSectionAutoLabel` from the `Bento` config; bento keeps width/spacing/inset block dimensions but is no longer a `contentSection`. With no preamble, **every heading is a cell** (no top heading consumed).
- [x] A `bento-cell`'s content splits on a top-level `---` into `media` / body / footer zones using `data-section`, matching `card`.
- [x] A visual rune (chart/map/gallery/diagram/embed/sandbox) in the media zone is sized by the WORK-339 media-zone selector, with no bento-specific per-guest CSS.
- [x] The media zone is a **clipping container** (`overflow: hidden`) so a `showcase` guest can bleed to a partial view; the existing `showcase--in-bento-cell` modifier + `showcase.css` clipping work end-to-end.
- [x] The cell background is **tint-deferrable** (the cell does not hard-set a background that would defeat `tint`), so a per-cell `{% tint %}` / `tint-mode` paints background + text.
- [x] **Cell titles render as a uniform, auto-detected heading level** with uniform visual size (the `headline` zone typography) — not a bare `<span>`, not the input heading level — contributing to the document outline.
- [x] The cell carries `data-media-position` (default `top`) on the same contract as `card`, ready for WORK-348 to drive placement.
- [x] The existing icon-as-visual path keeps working; the docstring's image/emoji-as-visual claim is reconciled with the code under the new zone model.
- [x] Tests cover: bento with no preamble, a cell with a `---` media split, a guest sized in the media zone, a `showcase` bleed clipped to a cell, a tinted cell, and a uniform-level title.

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

## Resolution

Completed: 2026-06-06

Branch: `claude/v0.19-bento`

### What was done
- **Bento is now a grid primitive, not a page-section.** Dropped `sections` / `pageSectionAutoLabel` / `property: 'contentSection'` / `pageSectionProperties` from the `Bento` config + transform. Content before the first heading renders as loose content above the grid (no eyebrow/title/blurb chrome); every heading is a cell.
- **Cell adopts card's zone contract.** Rewrote `bentoCell` to extract the leading heading as the **title** and split the remainder on top-level `---` into `media` / body / footer zones (`zoneRoles`, mirroring card's by-count mapping). Media zone is `data-section="media"` → styled by the WORK-339 selector with no bento-specific per-guest CSS; the cell carries `data-media-position` (default `top`) and an optional `href` stretched link.
- **Uniform-level titles.** The title renders as a real `<h3 data-name="title">` (normalized from the input level), contributing to the document outline — replacing the old invisible `<span>`. The input heading level now drives *only* tile size (tiered: h2→large, h3→medium, h4+→small).
- **Tint-deferrable + clipping.** Cell background moved to `:where(.rf-bento-cell)` (zero specificity) so a per-cell `{% tint %}` repaints it; the media zone clips (WORK-339) so a `showcase--in-bento-cell` bleed peeks.
- Rewrote `bento.css` (dropped the page-section preamble styles; added content/media/body/footer/link zones), the bento test (7 scenarios), and cleaned `bento.md` (removed the `sizing`/span-mode + page-section-header docs). Regenerated both structure contracts.

### Notes
- Title level is a **uniform fixed `h3`** (the key requirement — cells are siblings at one outline level). Context auto-detection (one below the surrounding section heading) is a possible refinement; no general headingLevel-auto-detect helper exists today.
- `span` mode / the `sizing` attribute were removed here (subsumed by WORK-348's `cols`/`rows`); the proportional presets + 6-col default + collapse land in WORK-348.
- Full suite green (3063); css-coverage + contracts pass.

{% /work %}
