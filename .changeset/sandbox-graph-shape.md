---
"@refrakt-md/runes": minor
---

**`data-shape="graph"` for data-bound sandboxes** (SPEC-093 / WORK-390) — the third payload shape, after `flat` and `tree`. A `{% sandbox data="type:spec type:work" data-shape="graph" %}` projects the queried entities as **nodes** and walks their SPEC-072 relationship edges into a node-link payload: `window.RF_DATA = { shape: "graph", nodes, edges }`, where each edge is `{ from, to, kind }`. Only edges whose both endpoints are in the selection are kept, so the graph is closed — ready for a force-directed or node-link layout.
