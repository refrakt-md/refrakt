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
  structure the cross-page pipeline can read. `type` / `title` / `stacked`
  become **modifiers** (so the engine emits `data-chart-type` / … for the
  client) — no JSON-in-meta, no `postTransform`.
- **Rendering → an `rf-chart` web component.** The progressive-enhancement
  pattern `sandbox` / `diagram` already use (which chart oddly lacks): the
  element reads the `<table>` + `data-*` and renders. **Initially it renders only
  `svg`** — there is *no* `provider` attribute and no selection layer yet.
- **Providers are app-owned, theme-orthogonal** (the future shape). Web
  components live in `@refrakt-md/behaviors` (zero-dep) and are registered by the
  *framework integration* (`registerElements()`), **not** by the theme — lumina
  is tokens + CSS only. So a renderer is an app/author concern; the theme shapes
  only how the chart *looks* (it reads `var(--rf-color-*)`, like diagram's
  Mermaid colors). See the (deferred) provider model below.

The valuable, cheap move is the **seam**: table-as-IR + `rf-chart` + the existing
SVG drawing, kept as a self-contained function so a future provider registry is a
lift-and-shift, not a rewrite. The provider abstraction itself is deferred —
building it before a second real renderer exists is a YAGNI trap.

## Benefits

- A11y + no-JS: the data table is the fallback and the data source.
- SPEC-081 compliance: data is semantic IR; rendering is pluggable presentation;
  the engine config stops carrying a renderer.
- Extensibility: a charting library or alternate renderers become additive,
  behind a stable contract.
- Drops chart out of the `data-field` meta problem (WORK-331) for free — once
  data is a table and the knobs are modifiers, chart emits no field-metas.

## Near-term shape (WORK-333) — svg only, no provider layer

- Chart stays **in core**. The rune emits `<table data-name="data">` + the
  `type`/`title`/`stacked` modifiers; the `rf-chart` element + the SVG drawing
  live in `behaviors` next to `rf-diagram` / `rf-sandbox`; the CSS stays in
  lumina. **No new package.**
- **No `provider` attribute, no `data-provider`, no registry.** `rf-chart`
  renders svg, full stop. The only forward-looking nicety: keep the SVG drawing
  as a self-contained `renderSvg(data, container, opts)` function so the future
  provider extraction is lift-and-shift.

### Data sourcing — the `<table>` is the single source of truth

- `rf-chart` parses the `<table>` **in place** on connect (`thead th` → headers,
  `tbody` cells → rows) into a `ChartData` object and hands *that* to
  `renderSvg(...)`. There is **no second copy of the data** — no `<template>`, no
  serialized JSON. Re-introducing a blob would walk back the exact sin this spec
  removes (data-in-`<meta>`, table discarded) and create two representations that
  can drift.
- **Why this differs from `diagram`** (which deliberately keeps a separate inert
  `<template>` for its source): a diagram's source is whitespace-sensitive *free
  text* in a `<pre>` that future highlighting could corrupt via `textContent`. A
  table is *structured and individually addressable* (each datum is its own
  `<td>`, read by position) — there is no "highlighting mangles the stream"
  failure mode, so no wholesale duplicate is warranted.
- **One robustness hook, reserved (not built now):** the table's narrower risk is
  display-formatting of numeric cells (a future `1,200` / `$1.2k` would break
  `parseFloat(textContent)`). The clean guard is an *optional per-cell*
  `data-value` for when display ≠ canonical (`<td data-value="1200">1,200</td>`),
  with the element reading `cell.dataset.value ?? cell.textContent`. Today cells
  carry raw authored values, so it is unused — it just keeps the table canonical
  instead of forcing a parallel channel if formatting ever lands.

## Provider model (deferred — WORK-334, when a second renderer is needed)

When a real second renderer appears, introduce the abstraction below. It is
**not** built in WORK-333.

- **One element, delegation — not per-provider elements.** `rf-chart` keeps
  being the only element; the provider becomes *a value* (`data-provider`), not a
  different structure. The element parses the table once and hands off. (Rejected
  alternative: per-provider custom elements — they'd push a presentation choice
  into the IR and duplicate the shared plumbing.)

- **Provider contract** (SSR-capable optional):

  ```ts
  interface ChartProvider {
    render(data: ChartData, container: HTMLElement, opts: ChartOptions): void | Promise<void>;
    renderToString?(data: ChartData, opts: ChartOptions): string; // build-time / no-JS
  }
  ```

  The provider owns the container's content (canvas for chartjs, innerHTML for
  svg, DOM ops for d3). Heavy libs are **lazy-loaded via dynamic import only when
  selected** — exactly how `diagram` pulls Mermaid on demand.

- **Registration is app-level**, mirroring `behaviors`'
  `registerBehaviors` / `overrideBehavior`: a `registerChartProvider(name, p)`
  called where `registerElements()` runs. Selection precedence: **author attr →
  site/app default → built-in `svg`** (the modifier-default mechanism); the
  default is a site/app decision, never the visual theme's.

- **Each renderer is its own optional package** — `@refrakt-md/chartjs`,
  `@refrakt-md/d3` — so heavy deps are opt-in and tree-shakeable, core stays
  lean. Two shapes, decide when the first lands:
  - **(A) plain provider package** — exports a `ChartProvider`; the app registers
    it at its client entry. No Plugin-system change. *(lean: start here)*
  - **(B) provider as a refrakt Plugin** — the package gains a `chartProviders`
    contribution, is added to `refrakt.config.plugins[]`, and the framework
    integration auto-registers it client-side. Ergonomic but needs a small
    Plugin-surface extension + client wiring. (A `ChartProvider` is a
    *client-runtime* artifact, distinct from the content-build `Plugin` type — so
    (B) is a deliberate extension, not the default reading of "plugin".)

- **Theme stays orthogonal / a11y.** The chart reads `var(--rf-color-*)` so it
  adapts to any theme regardless of provider; keep the `<table>` visually-hidden
  after render (chart + SR-readable data table).

## Theming contract — the provider-facing interface ({% ref "WORK-353" /%})

Theming must be **provider-agnostic**, because a canvas provider (chart.js) can't
be CSS-styled and a d3 provider draws its own DOM. So the contract is a set of
**`--rf-chart-*` custom properties** (the theme's vocabulary) that *every provider
reads and translates* into its rendering — not CSS rules written against our SVG's
internals.

**Hard rule: every themeable aspect is backed by a `--rf-chart-*` custom property;
there are no CSS-only knobs.** The SVG provider *consumes* the props
(`fill: var(--rf-chart-series-1)`, geometry via `getComputedStyle`); a canvas
provider reads the same props via `getComputedStyle` and maps them to its options;
a d3 provider applies them to its scales/attrs. One vocabulary, per-provider
translation.

The surface: a **categorical palette** (`--rf-chart-series-1…N`, distinct from the
semantic status tokens), **geometry** (bar thickness/ratio/gap/radius, point
radius, line width), and **typography/grid**. Plus a **sentiment colouring mode**:
when data cells carry `data-meta-sentiment` (the metadata dimension), bars map
`sentiment → semantic token` — provider-agnostic intent, provider-specific
application. The contract is a *common floor* (on-brand under any provider);
provider superpowers (chart.js animations, d3 scales) are out of contract.

`WORK-353` defines this surface and ships the **SVG reference implementation**;
any provider added under `WORK-334` must honor it.

## Open decisions (small, scoping)

- **No-JS posture (default).** Default to table-only fallback (client renders the
  chart), with SSR/no-JS-chart available as a **per-provider capability**
  (`renderToString`, invoked at the framework-integration layer) rather than a
  global mode. Lean: yes — the deterministic built-in `svg` is the natural first
  SSR-capable provider. (Not needed for WORK-333.)

### Resolved

- **Home: stays in core.** No chart-specific package now (or likely ever). Future
  renderers are per-provider optional packages, registered app-side — never
  lumina/CSS, and not requiring chart to relocate.
- **Initial scope: svg only, no provider attribute.** The provider abstraction
  (registry / `data-provider` / selection / per-provider packages) is entirely
  `WORK-334`, gated on a concrete second renderer.

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
  `postTransform`. *(done — v0.18.0)*
- `WORK-353` — the **theming contract** (`--rf-chart-*` custom-property surface +
  sentiment mode) + SVG reference implementation; the provider-facing interface
  any future renderer must honor.
- `WORK-334` — the provider-selection model + any additional providers (blocked
  on the open questions above); each provider must honor the `WORK-353` contract.

{% /spec %}
