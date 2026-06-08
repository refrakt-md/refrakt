---
"@refrakt-md/behaviors": minor
"@refrakt-md/lumina": minor
"@refrakt-md/runes": patch
---

Chart theming contract (SPEC-083 / WORK-353): the `rf-chart` SVG renderer no
longer hardcodes its palette or geometry. Every paint + geometry value is now an
`--rf-chart-*` custom property Lumina ships on `.rf-chart` — a dedicated
categorical series palette (distinct from the semantic status tokens), bar/point/
line geometry, and typography/grid. The renderer emits only tagged elements
(`.rf-chart__bar[data-series]`, `__point`, `__line`, `__axis`, `__label`) that
`chart.css` paints from the props, and reads layout geometry via `getComputedStyle`
— so a theme retones a chart by setting `--rf-chart-*` alone, and a future canvas/
d3 provider reads the same vocabulary. Adds a **sentiment colouring** mode: data
cells carrying `data-meta-sentiment` colour by the semantic token
(positive→success, negative→danger, caution→warning, neutral→muted).

Also fixes `aggregate layout="chart"` to emit the chart rune's field channel, so a
non-bar `chart-type` survives the identity transform and the `.rf-chart` class
isn't doubled.
