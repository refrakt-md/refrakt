{% work id="WORK-380" status="in-progress" priority="medium" complexity="moderate" source="SPEC-086" tags="docs,showcase,site,surfaces" milestone="v0.20.1" %}

# Surface-model showcase gallery

The v0.20.0 surface model shipped with per-rune reference docs (`card` cover,
`recipe` cover, `bg`, `surfaces.md`) but no single page that shows the vocabulary
*as a system*. Build a dedicated showcase gallery that demonstrates the whole
surface model on one page — the "wow" surface a visitor lands on to grasp what
the model can do — organised by the model's own axes.

## Gallery sections (one live `preview` cluster each)

- **Chrome** — `elevation` (self-surface shadow scale) and `frame` + facets on
  the media surface (aspect, crop `anchor`, silhouette `frame-shadow`,
  displacement / `oversize` peek). The `elevation` vs `frame-shadow` distinction
  made visible side by side.
- **Fills** — `tint` (named + tint-mode), the tint-tracking `inset` surface,
  `substrate` patterns (dots/grid/lines/cross/checker), and `bg` gradients
  (token-driven, named directions).
- **Cover layout** — the poster card (full scope) and the recipe poster (header
  scope): `content-place`, the default + frost `scrim`, intrinsic `height`/`aspect`.
- **Posture** — a linked cover/media card showing a presentational guest
  (the demotion is the point: one clean interaction target).

## Acceptance Criteria
- [ ] A dedicated gallery page exists under `site/content/` demonstrating the
  surface model across all four axes (chrome, fills, cover, posture), each as a
  live `preview` cluster with the authored Markdown shown.
- [ ] The page reads as a curated showcase (magazine rhythm), not an API dump —
  short framing prose per axis, cross-linked to the `surfaces`, `card`, `bg`, and
  `recipe` references for the full attribute tables.
- [ ] Renders correctly in light and dark mode and at mobile widths; no
  layout/overflow regressions (verify the cover/frost and displaced-frame cells
  especially).
- [ ] Linked from the docs nav and cross-referenced from `runes/surfaces.md`.

## Approach
Author as standard site content with the `preview` rune for live results. Reuse
the canonical example imagery already used in the references (e.g. the tequila
sunrise cover). Keep live `sandbox`/iframe use out of this page — the surface
model is all static rendering, so the gallery stays fast.

## References
- Surface model: {% ref "SPEC-086" /%}, {% ref "SPEC-087" /%}, {% ref "SPEC-088" /%}, {% ref "SPEC-089" /%}, {% ref "SPEC-090" /%}
- Existing docs: `site/content/runes/surfaces.md`, `runes/card.md`, `runes/bg.md`, `runes/learning/recipe.md`

{% /work %}
