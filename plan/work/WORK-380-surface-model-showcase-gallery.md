{% work id="WORK-380" status="review" priority="medium" complexity="moderate" source="SPEC-086" tags="docs,showcase,site,surfaces" milestone="v0.20.1" %}

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
- [x] A dedicated gallery page exists under `site/content/` demonstrating the
  surface model across all four axes (chrome, fills, cover, posture), each as a
  live `preview` cluster with the authored Markdown shown.
- [x] The page reads as a curated showcase (magazine rhythm), not an API dump —
  short framing prose per axis, cross-linked to the `surfaces`, `card`, `bg`, and
  `recipe` references for the full attribute tables.
- [ ] Renders correctly in light and dark mode and at mobile widths; no
  layout/overflow regressions (verify the cover/frost and displaced-frame cells
  especially).
- [x] Linked from the docs nav and cross-referenced from `runes/surfaces.md`.

## Approach
Author as standard site content with the `preview` rune for live results. Reuse
the canonical example imagery already used in the references (e.g. the tequila
sunrise cover). Keep live `sandbox`/iframe use out of this page — the surface
model is all static rendering, so the gallery stays fast.

## References
- Surface model: {% ref "SPEC-086" /%}, {% ref "SPEC-087" /%}, {% ref "SPEC-088" /%}, {% ref "SPEC-089" /%}, {% ref "SPEC-090" /%}
- Existing docs: `site/content/runes/surfaces.md`, `runes/card.md`, `runes/bg.md`, `runes/learning/recipe.md`

## Resolution

Completed: 2026-06-10

Branch: `claude/work-380-surface-gallery`

### What was done
- Added `site/content/runes/surface-gallery.md` — a showcase page presenting the v0.20.0 surface model as a system, in four axes, each a live `{% preview source=true %}` cluster:
  - **Chrome** — elevation-vs-frame-shadow distinction side by side, the elevation scale (sm/md/lg), and frame facets (aspect/anchor + a displaced/oversize peek in a card media zone).
  - **Fills** — named `tint` palettes (dracula/solarized), `substrate` patterns incl. `substrate-fill="inset"`, and token-driven gradient fills (linear + radial via `bg-gradient`/`bg-from`/`bg-to`/`bg-via`).
  - **Cover** — poster `card` (frost scrim, `content-place`, `height`) plus a centred-overlay default-scrim card, and the `recipe` header-scope poster.
  - **Posture** — a linked cover poster as a single interaction target, with the media-guest demotion contract explained and linked.
- Registered in `site/content/runes/_layout.md` nav under the "Rune Catalog" group, after `surfaces`.
- Cross-linked from `site/content/runes/surfaces.md` "See also".
- Examples reuse the canonical imagery already in the shipped references (tequila-sunrise cover, picsum frames) and the registered tint/token names — no new assets, all static rendering (no live `sandbox`/iframes).

### Verification
- Full `vite build` of the site is green; the emitted `runes/surface-gallery.html` contains all 9 preview clusters — 16 cards, 1 figure, 1 recipe, 4 cover instances — with scrim/substrate/elevation/frame/gradient/tint markup present. No transform warnings for this page.

### Why review, not done
- The "renders correctly in light and dark mode and at mobile widths; no layout/overflow regressions" criterion is left unchecked: no headless browser is available in this container, so I could only verify structural rendering via the build, not the visual/responsive pass. The examples derive from already-shipped, CSS-coverage-tested primitives and near-copies of working doc examples (the displaced-peek card is the only genuinely new composition), so confidence is high — but it wants a quick human glance at the dev server (`cd site && npm run dev` → /runes/surface-gallery), especially the cover/frost and displaced-frame cells. Flip to done once eyeballed.

{% /work %}
