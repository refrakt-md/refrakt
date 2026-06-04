{% work id="WORK-349" status="ready" priority="medium" complexity="moderate" source="SPEC-076" milestone="v0.19.0" tags="aggregation,chart,runes,composability" %}

# Aggregate chart layout

Close the one gap between "we have the data" and "we can chart it." Plan entities
are already registered in the main site's registry, so `{% aggregate type="work"
group="status" %}` returns real counts today — but `aggregate` can only render an
inline integer or a body-zoned template, not a chart. Add a `layout="chart"` mode
that renders the grouped counts as an SVG, reusing the `rf-chart` renderer from
WORK-333. This is the SPEC-076 "chart layout" future extension, and the clean
"data rune feeds viz rune" composition.

## Acceptance Criteria
- [ ] `aggregate` accepts `layout="chart"` (alongside the existing inline / body-zoned forms); with a `group`, it charts one bar/point per group keyed by the group label, value = group count (or `value`/`percent` when supplied).
- [ ] Output reuses the WORK-333 chart pipeline: emit the same `rf-chart` element + `data-name="data"` table source, so the SVG renderer and no-JS table fallback work unchanged.
- [ ] Chart type (`bar` default, `line`) and a title are configurable, consistent with the `chart` rune's attributes.
- [ ] Domain-aware group ordering (SPEC-072) is honored on the axis, so e.g. status groups read in lifecycle order.
- [ ] Empty query renders the `empty` fallback, not a broken chart.
- [ ] Tests cover: grouped count chart, value/percent chart, ordering, and the empty state.

## Approach
In `aggregate-resolve.ts`, add a `chart` branch that builds a group→count table
and hands it to the chart construction path (the `rf-chart` element + caption +
`data-name="data"` table) rather than the span/template path. Keep the table as
the canonical source so the existing `<rf-chart>` web component upgrades it.

## References
- `packages/runes/src/tags/aggregate.ts`, `packages/runes/src/aggregate-resolve.ts`
- Chart renderer: `packages/runes/src/tags/chart.ts`, `packages/behaviors/src/elements/chart.ts` (WORK-333)
- {% ref "SPEC-076" /%} (chart layout future extension)

{% /work %}
