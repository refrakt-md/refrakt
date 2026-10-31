---
'@refrakt-md/runes': patch
'@refrakt-md/skeleton': patch
'@refrakt-md/lumina': patch
---

Fixes found reviewing the composed `hero` on staging.refrakt.md:

- **A `{% bg %}` or `{% tint %}` in a composed rune lands on its paint carrier**, as the `bg` and `tint` attributes already did, rather than on the empty root. A backdrop was positioned against the page and filled the viewport's height rather than the band.
- **A rune carrying a background is its layer's containing block** (`position: relative`, at zero specificity). A plain `section` with a `{% bg %}` had the same bug.
- **A full-width composed rune pads its carrier**, not its empty root, so the carrier's background, cover well and surface fill the bleed.
- **A stacked `end` split puts its media after the content**, whatever the source order. Every split rune: `section`, `card` and the rest.
- **A section header is start-aligned by default and never wider than its column**, so a pill eyebrow keeps its width and a long word overflows a centred header evenly.
- **A `display` or `marquee` title builds its gradient from its own colours**, so a cover band's light-on-dark title stays light.
