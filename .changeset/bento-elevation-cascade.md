---
"@refrakt-md/marketing": minor
---

Bento: a grid-level `elevation` now cascades to cells (joining the `frame`
cascade) so `{% bento elevation="md" %}` lifts each cell rather than the grid
box; a cell's own `elevation` still wins. Fixes the bento reference page's
frame/elevation example (the images needed an `---` to land in the media zone).
