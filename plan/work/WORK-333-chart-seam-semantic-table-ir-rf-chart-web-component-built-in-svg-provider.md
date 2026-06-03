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
- [ ] `type` / `title` / `stacked` (and a `provider` knob defaulting to `svg`)
  are modifiers, surfaced as `data-*` for the client; chart emits no field-metas.
- [ ] Chart's engine `postTransform` (the inline SVG builder) is removed; the
  rune renders as `rf-chart` wrapping the data table.
- [ ] An `rf-chart` web component (in `@refrakt-md/behaviors`, mirroring
  `sandbox` / `diagram`) reads the table + `data-*` and renders the chart via a
  **provider**; with JS off, the data table remains visible.
- [ ] The current SVG renderer is relocated out of the engine config into a
  built-in `svg` provider behind the provider contract (the contract may be
  minimal/single-provider for now; full selection is `WORK-334`).
- [ ] Output parity for the no-JS fallback is well-defined (data table); the
  rendered chart is visually equivalent to today's SVG for the default provider.
- [ ] Full suite + both structure contracts green; chart's tests updated (incl.
  any that asserted the JSON-in-meta or the post-engine `<svg>`).

## Approach

- Rewrite `chart.ts` to emit `<figure>` → `<table data-name="data">` + the
  modifiers; drop `extractTableData` → JSON meta.
- Add `rf-chart` to `packages/behaviors/src/elements/` that parses the table and
  draws via the `svg` provider (port the existing axis/bar/scale code there).
- Decide SSR vs client-draw for the built-in `svg` provider (an open question in
  {% ref "SPEC-083" /%}); pick the simplest that preserves the fallback contract.
- Keep the provider boundary thin and single-implementation; `WORK-334` widens
  it once the selection model is settled.

## Dependencies

- {% ref "SPEC-083" /%} — the design (note: the provider-*selection* model is an
  open question being settled separately; this item only needs the single-
  provider seam).

## Notes

- This also removes chart from the {% ref "WORK-331" /%} `data-field` meta
  problem as a side effect (no field-metas once data is a table + knobs are
  modifiers).
- Likely candidate to relocate chart into a plugin (see {% ref "SPEC-083" /%}
  open questions); decide as part of this or defer to `WORK-334`.

{% /work %}
