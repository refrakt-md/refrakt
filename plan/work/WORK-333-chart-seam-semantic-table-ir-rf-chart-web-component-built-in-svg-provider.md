{% work id="WORK-333" status="ready" priority="medium" complexity="moderate" source="SPEC-083" tags="runes,chart,web-component,accessibility,rendering,computation-boundary" %}

# Chart seam: semantic table IR + rf-chart web component (svg only)

Land the {% ref "SPEC-083" /%} seam. Move chart onto the two-layer boundary: the
data becomes a real `<table>` in the transform, and the rendering moves into an
`rf-chart` web component that draws **svg, full stop**. No provider attribute, no
registry, no selection — that abstraction is `WORK-334`, gated on a real second
renderer. Chart stays in core; no new package.

## Background

Today `chart.ts` parses the authored table, `JSON.stringify`s it into a
`<meta>`, discards the source table, and the engine `postTransform` re-parses
that JSON to hand-build a static `<svg>` baked into `coreConfig`. See
{% ref "SPEC-083" /%} for the full critique.

## Acceptance Criteria

- [ ] The transform keeps the authored data as a real `<table data-name="data">`
  (the no-JS / screen-reader fallback and the data source) — no JSON-in-`<meta>`.
- [ ] `type` / `title` / `stacked` are modifiers surfaced as `data-*` for the
  client; chart emits no field-metas. (No `provider` attribute.)
- [ ] Chart's engine `postTransform` (the inline SVG builder) is removed; the
  rune renders as `rf-chart` wrapping the data table.
- [ ] An `rf-chart` web component (in `@refrakt-md/behaviors`, mirroring
  `sandbox` / `diagram`) parses the `<table>` once and draws the svg. The
  `<table>` stays in the DOM (visually-hidden) after a successful render for
  screen readers.
- [ ] The SVG drawing is a self-contained `renderSvg(data, container, opts)`
  function (so a future provider registry is a lift-and-shift, not a rewrite) —
  but **no registry / `ChartProvider` contract is built here**.
- [ ] Output parity: the no-JS fallback is the data table; the rendered chart is
  visually equivalent to today's SVG.
- [ ] Full suite + both structure contracts green; chart's tests updated (incl.
  any that asserted the JSON-in-meta or the post-engine `<svg>`).

## Approach

- Rewrite `chart.ts` to emit `<table data-name="data">` + the modifiers; drop
  `extractTableData` → JSON meta and the `postTransform`.
- Add `rf-chart` to `packages/behaviors/src/elements/` (register in
  `registerElements()`); port the existing axis/bar/scale code into a standalone
  `renderSvg(...)` the element calls.
- Keep the CSS in `packages/lumina/styles/runes/chart.css`.

## Dependencies

- {% ref "SPEC-083" /%} — the design (near-term shape: svg only, no provider
  layer; chart stays in core).

## Notes

- Removes chart from the {% ref "WORK-331" /%} `data-field` meta problem as a
  side effect (no field-metas once data is a table + knobs are modifiers).
- The provider registry / `data-provider` / per-provider packages are all
  `WORK-334`, deferred until a concrete second renderer exists.

{% /work %}
