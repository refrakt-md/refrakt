---
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/learning": minor
"@refrakt-md/lumina": minor
---

SPEC-089 cover layout. Adds `media-position="cover"` as a `media-position`
engine variant (SPEC-091): the media well fills the rune interior and content
overlays it, with a one-attribute switch from `top|bottom|start|end`. Two
rune-declared scopes — `full` (card: the whole box overlays) and `header`
(recipe: only the title band overlays, body flows below) — bound the overlay
region; there is no overlay primitive in the layout config. Adds `content-place`,
a 2-axis logical overlay anchor (`<block> <inline>`, mapping to `align`/`justify`)
active only in cover mode (warns otherwise), whose `auto` default — also the
behaviour when unset — adapts to the cover region's container-query orientation.
Cover turns on a default scrim on the media surface (consuming the SPEC-088
scrim facet), weighted toward the content edge and following `content-place`
unless an explicit `scrim="top|bottom|left|right"` pins it; `scrim="none"` opts
out. `scrim-type="frost"` swaps the gradient for a frosted-glass blur (`scrim-blur`
scale) — in cover mode the scrim renders on the media well, never the
self-surface bg layer. The overlay foreground follows `scrim-tone` (a dark scrim
yields light text), scoped to the band in header scope. Adds a card intrinsic-height knob
(`height` named scale + `aspect`) for cover / `bg`-only cards, and documents
cover mode in the card reference.
