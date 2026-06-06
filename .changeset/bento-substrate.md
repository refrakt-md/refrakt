---
"@refrakt-md/marketing": minor
"@refrakt-md/lumina": minor
---

Bento substrate (SPEC-085) — v0.19.0 batch C.

- **Bento is a grid primitive, not a page-section.** Dropped the eyebrow/title/blurb preamble; every heading is now a cell. A titled bento is a composition (wrap it in `feature`/section). Content before the first heading renders as loose content above the grid.
- **Cell adopts card's zone contract.** A `bento-cell`'s content splits on a top-level `---` into `media` / body / footer zones (`data-section`), mirroring `card`. The media zone is clipped/sized by the name-agnostic WORK-339 selector (no bento-specific per-guest CSS) so a `showcase` bleed peeks. The cell background is tint-deferrable, and the leading heading becomes a uniform-level `<h3>` title contributing to the outline.
- **Proportional sizing model.** A 6-column default for both authoring modes; `size` presets resolve as fractions of the column count (small ⅓, medium ½, large ⅔ × 2 rows, full = all), and `cols` / `rows` give precise per-axis spans that override the preset. Uniform fixed row tracks (`grid-auto-rows: var(--rf-bento-row-height)`, never column-tied). Author-controlled `collapse="sm|md|lg|never"` plus automatic progressive column reduction with `min(span, current-columns)` auto-capping.
- **Size-derived media placement + link tiles.** `media-position` (`top|bottom|start|end`) is author-controllable per cell with a size-derived default (large/full → beside, smaller → on top); an optional `href` makes a whole cell a link.
- **Explicit `{% bento-cell %}` authoring.** A bento whose children include `bento-cell` tags uses them directly — full per-tile control (the dashboard case) — short-circuiting heading conversion (explicit wins, no mixing). The legacy `span` attribute is removed (subsumed by `cols`). `cols` / `rows` author as unquoted numbers (`cols=4 rows=2`), matching `columns`.
- Rewrote the bento rune reference docs for the new substrate.
- **Collapse is a stack, not a shrunken grid.** At a single column the fixed row track is dropped (`grid-auto-rows: auto`) so cells size to their content and text is never clipped; media reflows to an aspect-ratio banner (`--bento-media-aspect`, default 16/9) on top. Cells are text-first in grid mode too — the body keeps its height and the media zone absorbs the leftover track and crops.
