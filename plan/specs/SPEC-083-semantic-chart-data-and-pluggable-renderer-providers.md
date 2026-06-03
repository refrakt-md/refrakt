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
- **Rendering → pluggable presentation.** A single `rf-chart` web component (the
  progressive-enhancement pattern `sandbox` / `diagram` already use, which chart
  oddly lacks) reads the `<table>` + `data-*` and **delegates** to the selected
  **provider**. No-JS users keep the data table.
- **Providers are app-owned, theme-orthogonal.** Web components live in
  `@refrakt-md/behaviors` (zero-dep) and are registered by the *framework
  integration* (`registerElements()`), **not** by the theme — lumina is tokens +
  CSS only. So the renderer is an app/author concern; the theme shapes only how
  the chart *looks* (the provider reads `var(--rf-color-*)`, like diagram's
  Mermaid colors). See the resolved model below.

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

## Provider model (resolved)

- **One element, delegation — not per-provider elements.** The rune always emits
  `<rf-chart>` + the `<table>`; the provider is *a value* (`data-provider`), not
  a different structure. On connect the element parses the table once →
  `{ headers, rows }`, reads `data-provider`, and hands off to a provider.
  Per-provider custom elements are rejected: they'd push a presentation choice
  into the IR (the transform would pick the tag) and duplicate the shared
  plumbing (table parsing, token reading, fallback handling).

- **Provider contract** (SSR-capable optional):

  ```ts
  interface ChartProvider {
    render(data: ChartData, container: HTMLElement, opts: ChartOptions): void | Promise<void>;
    renderToString?(data: ChartData, opts: ChartOptions): string; // build-time / no-JS
  }
  ```

  The provider owns the container's content (canvas for chartjs, innerHTML for
  svg, DOM ops for d3). Heavy libs are **lazy-loaded via dynamic import only when
  selected** — exactly how `diagram` pulls Mermaid on demand; the built-in `svg`
  provider is bundled and zero-dep.

- **Registration is app-level, mirroring existing precedent.** `behaviors`
  already exposes `registerBehaviors(additional)` / `overrideBehavior(name, fn)`;
  a chart provider registry (`registerChartProvider(name, provider)`) registers
  the same way, where `registerElements()` is called. Adding a provider is an
  app/plugin action — never a lumina/CSS action.

- **Selection precedence (rides existing machinery).** `provider` is a modifier
  resolved **author attr → site/app default → built-in `svg`**. The
  modifier-default mechanism already does author-value-else-config-default; the
  *default* is a site/app config decision, **not** the visual theme's.

- **Theme stays orthogonal.** The chart reads design tokens (`var(--rf-color-*)`)
  at render time, so it adapts to any theme regardless of provider — the theme
  styles the result, never picks the renderer.

- **Accessibility.** Keep the `<table>` in the DOM after a successful render
  (visually-hidden) — chart + SR-readable data table, the gold-standard pattern,
  essentially free here.

## Open decisions (small, scoping)

- **No-JS posture (default).** Default to table-only fallback (client renders the
  chart), with SSR/no-JS-chart available as a **per-provider capability**
  (`renderToString`, invoked at the framework-integration layer, same place as
  `registerElements()`) rather than a global mode. Lean: yes — the deterministic
  built-in `svg` is the natural first SSR-capable provider.
- **Home.** Since providers register app-side (not in lumina), chart + the
  provider zoo wants to be a **plugin**, with `behaviors` holding only the
  built-in `svg`. Decide whether the seam lands in core first (`WORK-333`) then
  chart relocates, or chart moves to a plugin as part of the seam.
- **Which providers ship.** Only built-in `svg` initially; additional providers
  are demand-driven (`WORK-334`).

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
