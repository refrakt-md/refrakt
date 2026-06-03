{% spec id="SPEC-083" status="draft" source="SPEC-081" tags="runes,chart,rendering,providers,web-component,accessibility,computation-boundary" %}

# Semantic chart data and pluggable renderer providers

Re-home the `chart` rune onto the SPEC-081 two-layer boundary: the chart's
**data** is semantic content (the rune transform), and the chart's **rendering**
is pluggable presentation (a web component + a renderer provider) — not a single
SVG renderer frozen into the framework-agnostic engine config.

## Background — what chart does today (and why it's wrong)

`chart` (`packages/runes/src/tags/chart.ts` + its `coreConfig` entry) stacks
three mistakes:

1. **It discards the source table.** The transform parses the authored markdown
   table into `tableData` and `JSON.stringify`s it into a `<meta>` — the real
   `<table>` is thrown away. So the accessible, no-JS representation of the data
   is gone.
2. **It blobs the data.** The data crosses as a JSON-in-`<meta>` payload (the
   same "raw data blob" anti-pattern SPEC-081/SPEC-082 are unwinding elsewhere).
3. **It bakes one renderer into the engine.** The engine `postTransform`
   re-parses that JSON and hand-builds a single static `<svg>` (axes, bars,
   scales). That rendering is theme- and framework-agnostic engine *config* —
   the worst place for a presentation choice that ought to vary.

Unlike the other five `postTransform` structure-builders (embed / diagram /
sandbox / mockup / comparison), which each have **one deterministic output** and
just need relocating into their transform, chart's *rendering is a genuine
variation point*: SVG today, a charting library tomorrow, or an
author/theme-selected provider. So chart needs a *design*, not a relocation.

## Direction

Apply the two layers cleanly:

- **Data → semantic IR (transform).** Keep the authored data as a real
  `<table data-name="data">`. It is simultaneously the source of truth, the
  no-JS / screen-reader fallback (better a11y than today's bare SVG), and a
  structure the cross-page pipeline can read. `type` / `title` / `stacked` /
  `provider` become **modifiers** (so the engine emits `data-chart-type` /
  `data-provider` / … for the client) — no JSON-in-meta, no `postTransform`.
- **Rendering → pluggable presentation.** An `rf-chart` web component (the
  progressive-enhancement pattern `sandbox` / `diagram` already use, which chart
  oddly lacks) reads the `<table>` + `data-*` and renders via the selected
  **provider**. No-JS users keep the data table.
- **Providers are the embed model.** A built-in `svg` provider (today's
  renderer, *relocated out of the engine* into the provider) is the
  zero-dependency default; additional providers (e.g. a charting library) slot
  in behind the same contract. Selection is author- and/or theme-driven (the
  precise model is an open question — see below).

The valuable, cheap move is the **seam**: table-as-IR + `data-*` + a provider
hook, with the existing SVG as the one built-in provider. Adding more providers
is later, demand-driven work — building them speculatively is a YAGNI trap.

## Benefits

- A11y + no-JS: the data table is the fallback and the data source.
- SPEC-081 compliance: data is semantic IR; rendering is pluggable presentation;
  the engine config stops carrying a renderer.
- Extensibility: a charting library or alternate renderers become additive,
  behind a stable contract.
- Drops chart out of the `data-field` meta problem (WORK-331) for free — once
  data is a table and the knobs are modifiers, chart emits no field-metas.

## Open questions (provider-selection model — to be settled before WORK-334)

- **Selection precedence.** Author attribute (`provider=`) vs theme default vs a
  built-in fallback — what wins, and how does a theme set a default?
- **SSR vs client rendering.** Built-in `svg` could render at build (SSR, no-JS
  chart) or client-side in the web component (data-table fallback only). Which
  is the default contract?
- **Provider contract.** What does a provider receive (parsed data + options)
  and produce (DOM / canvas / SVG)? Registration shape.
- **Home.** Chart + a provider zoo (possible library deps) likely belongs in a
  **plugin**, not `packages/runes`. Decide whether the seam lands in core first
  or chart relocates to a plugin as part of this.
- **Which providers ship.** Only built-in `svg` initially; defer others.

## Non-goals

- **Not** building multiple providers up front (only the built-in `svg` seam).
- **Not** the other five `postTransform` relocations — those are a separate
  mechanical cleanup (`WORK-335`), not a design.
- **Not** re-opening the SPEC-080/081 field/block/layout vocabulary.

## Relationship to other specs

Extends {% ref "SPEC-081" /%} (the computation boundary): chart is the case
where the boundary runs *between* data (transform) and rendering (pluggable
presentation), rather than collapsing rendering into either layer. Sibling in
spirit to the budget-totals move (WORK-326), but a richer design because the
output representation is itself a variable.

## Work breakdown

- `WORK-333` — the seam: semantic `<table>` IR + `rf-chart` web component +
  built-in SVG provider; chart stops emitting JSON-in-meta and uses no
  `postTransform`.
- `WORK-334` — the provider-selection model + any additional providers (blocked
  on the open questions above).

{% /spec %}
