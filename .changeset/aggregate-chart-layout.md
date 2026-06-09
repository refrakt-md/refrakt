---
"@refrakt-md/runes": minor
---

Add `layout="chart"` to the `aggregate` rune (SPEC-076 chart layout): grouped
counts render as a chart — one bar/point per group — by emitting the `chart`
rune's `<rf-chart>` + `data-name="data"` table pipeline (SVG with a no-JS table
fallback). `chart-type` (`bar` default / `line` / `area` / `pie`) and
`chart-title` are configurable; a `value` sub-filter adds a second series; the
axis honors domain-aware group ordering; an empty query renders the `empty`
fallback rather than a broken chart.
