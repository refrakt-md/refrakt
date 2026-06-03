{% work id="WORK-333" status="ready" priority="medium" complexity="complex" source="SPEC-083" tags="runes,chart,web-component,accessibility,rendering,computation-boundary" %}

# Chart seam: semantic table IR + rf-chart web component + built-in SVG provider

Land the {% ref "SPEC-083" /%} seam. Move chart onto the two-layer boundary:
the data becomes a real `<table>` in the transform, the rendering moves into an
`rf-chart` web component behind a provider hook, and today's SVG becomes the
single built-in provider. No multi-provider selection yet — just the contract
that makes it possible.

## Background

Today `chart.ts` parses the authored table, `JSON.stringify`s it into a
`<meta>`, discards the source table, and the engine `postTransform` re-parses
that JSON to hand-build a static `<svg>` baked into `coreConfig`. See
{% ref "SPEC-083" /%} for the full critique.

## Acceptance Criteria

- [ ] The transform keeps the authored data as a real `<table data-name="data">`
  (the no-JS / screen-reader fallback and the data source) — no JSON-in-`<meta>`.
- [ ] `type` / `title` / `stacked` / `provider` are modifiers surfaced as `data-*`
  for the client; `provider` resolves **author attr → site/app default → `svg`**
  via the modifier-default mechanism. Chart emits no field-metas.
- [ ] Chart's engine `postTransform` (the inline SVG builder) is removed; the
  rune renders as `rf-chart` wrapping the data table.
- [ ] A single `rf-chart` web component (in `@refrakt-md/behaviors`, mirroring
  `sandbox` / `diagram`) parses the `<table>` once, reads `data-provider`, and
  **delegates** to a provider via a registry. The `<table>` stays in the DOM
  (visually-hidden) after a successful render for screen readers.
- [ ] A `ChartProvider` contract + an app-level registry exist, mirroring
  `registerBehaviors` / `overrideBehavior`:
  `interface ChartProvider { render(data, container, opts): void | Promise<void>; renderToString?(...): string }`
  plus `registerChartProvider(name, provider)`.
- [ ] The current SVG renderer is relocated out of the engine config into a
  built-in `svg` provider conforming to that contract (registered by default,
  bundled, zero-dep).
- [ ] Output parity: the no-JS fallback is the data table; the rendered chart is
  visually equivalent to today's SVG for the default provider.
- [ ] Full suite + both structure contracts green; chart's tests updated (incl.
  any that asserted the JSON-in-meta or the post-engine `<svg>`).

## Approach

- Rewrite `chart.ts` to emit `<table data-name="data">` + the modifiers; drop
  `extractTableData` → JSON meta and the `postTransform`.
- Add `rf-chart` + the provider registry to `packages/behaviors/src/elements/`;
  port the existing axis/bar/scale code into the built-in `svg` provider.
- Built-in `svg` renders client-side by default (data-table fallback). Wire its
  optional `renderToString` capability later if the no-JS-chart posture calls
  for it (see SPEC-083 open decisions) — the contract leaves room.

## Dependencies

- {% ref "SPEC-083" /%} — the design (provider model now resolved; this item is
  the single-built-in-provider seam + the registry/contract it delegates to).

## Notes

- Removes chart from the {% ref "WORK-331" /%} `data-field` meta problem as a
  side effect (no field-metas once data is a table + knobs are modifiers).
- **Home decision** (SPEC-083): chart + the provider zoo wants to be a plugin,
  with `behaviors` holding only built-in `svg`. Either land the seam in core
  here then relocate, or move chart to a plugin as part of this — confirm before
  starting.

{% /work %}
