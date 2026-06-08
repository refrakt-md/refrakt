---
"@refrakt-md/marketing": minor
---

Add a `levels` attribute to the `bento` rune's heading-sugar path: an author-defined
footprint ladder, indexed by relative heading depth, where each rung is a column
count `W` (× 1 row) or a footprint `WxH` — e.g. `levels="6,5,4,3,2,1"` (uniform-height,
width-by-depth; the former `span` mode) or `levels="4x2,3x1,2x1"`. Depth is measured
from the auto-detected base (shallowest heading), so the shallowest is always rung 0;
ladders shorter than the heading depth clamp to the last rung. Omitting `levels` keeps
the default tiered sizing unchanged, and explicit `{% bento-cell %}` grids ignore it.
