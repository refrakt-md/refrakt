{% work id="WORK-333" status="done" priority="medium" complexity="moderate" source="SPEC-083" tags="runes,chart,web-component,accessibility,rendering,computation-boundary" %}

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

- [x] The transform keeps the authored data as a real `<table data-name="data">`
  (the no-JS / screen-reader fallback and the data source) — no JSON-in-`<meta>`.
- [x] `type` / `title` / `stacked` are modifiers surfaced as `data-*` for the
  client; chart emits no field-metas. (No `provider` attribute.)
- [x] Chart's engine `postTransform` (the inline SVG builder) is removed; the
  rune renders as `rf-chart` wrapping the data table.
- [x] An `rf-chart` web component (in `@refrakt-md/behaviors`, mirroring
  `sandbox` / `diagram`) parses the `<table>` once and draws the svg. The
  `<table>` stays in the DOM (visually-hidden) after a successful render for
  screen readers.
- [x] **The `<table>` is the single source of truth** — `rf-chart` parses it in
  place (`thead th` → headers, `tbody` cells → rows); **no `<template>` / JSON
  copy.** Cells are read `dataset.value ?? textContent` (the `data-value` hook is
  reserved for future display-formatting; not emitted now). See SPEC-083 "Data
  sourcing".
- [x] The SVG drawing is a self-contained `renderSvg(data, container, opts)`
  function (so a future provider registry is a lift-and-shift, not a rewrite) —
  but **no registry / `ChartProvider` contract is built here**.
- [x] Output parity: the no-JS fallback is the data table; the rendered chart is
  visually equivalent to today's SVG.
- [x] Full suite + both structure contracts green; chart's tests updated (incl.
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

## Resolution

Completed: 2026-06-03

Branch: claude/rune-contract-hardening

### What was done
Landed the SPEC-083 seam — chart stays in core, svg-only, no provider layer.

- packages/runes/src/tags/chart.ts — the transform now keeps the authored
  markdown `<table>` as the single source of truth (data-name="data"), injects
  the title as a `<caption>`, and emits the rf-chart custom element. Dropped
  extractTableData → JSON-in-meta entirely.
- packages/runes/src/config.ts — removed chart's engine postTransform (the
  inline SVG builder); `type` / `stacked` are bag-only modifiers (→ data-type /
  data-stacked) the web component reads.
- packages/behaviors/src/elements/chart.ts (new) — RfChart web component:
  parses the table in place (thead → headers, tbody → rows; cells read
  `dataset.value ?? textContent`), draws the svg via a standalone
  `renderSvg(data, container, opts)` (ported from the old postTransform, bar +
  line + legend), and sets data-rendered so CSS visually-hides the table while
  keeping it for screen readers. Registered in elements/index.ts.
- packages/lumina/styles/runes/chart.css — styles the data-table fallback and
  visually-hides it under `.rf-chart[data-rendered]`; the svg/title/legend
  classes are unchanged (now created client-side).
- Tests: chart.test.ts (runes) rewritten to the table/bag structure;
  chart.test.ts (behaviors, jsdom) added — verifies svg render, table kept,
  data-value override, line + legend, and the empty-data guard.

### Notes
- Refinement vs the AC wording: `title` became the table `<caption>` (semantic,
  accessible, and the web component's title source) rather than a modifier —
  only `type`/`stacked` are modifiers.
- Chart drops out of the WORK-331 data-field meta problem for free (no
  field-metas now).
- The whole provider abstraction (registry / ChartProvider / data-provider /
  selection / per-provider packages) remains WORK-334, gated on a real second
  renderer; `renderSvg` is the standalone seam it will lift.
- Full suite green (3078); both structure contracts regenerated.

{% /work %}
