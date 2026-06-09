{% work id="WORK-353" status="done" priority="medium" complexity="moderate" source="SPEC-083" milestone="v0.19.0" tags="chart,lumina,theme,providers,composability" %}

# Chart theming contract and SVG reference implementation

Today the `rf-chart` web component hardcodes its palette (a JS array of semantic
token refs) and *all* geometry (bar width `bw*0.75`, point `r:4`, stroke/ font/
gridline sizes). A theme has no say over bar thickness, series colours, etc.
Define a **provider-agnostic theming contract** — a `--rf-chart-*` custom-property
surface — and make the built-in SVG renderer the reference implementation of it.

## The contract is the custom-property surface (not CSS against our SVG)

The provider-agnostic theming vocabulary is a set of `--rf-chart-*` CSS custom
properties. Each provider **reads and translates** them into its own model. The
SVG provider's class-based CSS is *one implementation* of that contract.

**Hard rule: every themeable aspect MUST be backed by a `--rf-chart-*` custom
property — no CSS-only knobs.** A future canvas provider (chart.js) can only read
custom properties via `getComputedStyle`; it can't be CSS-styled. So the SVG
provider must *consume* the props (`fill: var(--rf-chart-series-1)`), never
hardcode values in a rule. The property is the source of truth.

### Surface (initial full contract)
- **Palette:** `--rf-chart-series-1 … -N` — a dedicated categorical chart palette, *distinct from the semantic status tokens* (today's reuse of info/success/warning/danger as series colours is a smell to fix).
- **Geometry:** `--rf-chart-bar-thickness` (max px cap) / `--rf-chart-bar-ratio` (slot fraction, default 0.75), `--rf-chart-bar-gap`, `--rf-chart-bar-radius`, `--rf-chart-point-radius`, `--rf-chart-line-width`.
- **Typography / grid:** `--rf-chart-label-size`, `--rf-chart-label-color`, `--rf-chart-grid-color`, `--rf-chart-grid-width`.

### Sentiment colouring mode
Bars/points may be coloured by **sentiment** instead of the rotating palette: when
the data cells carry `data-meta-sentiment` (from the metadata dimension), map
`sentiment → semantic token` (positive→success, negative→danger, caution→warning,
neutral→muted). Provider-agnostic *intent* (the data convention), provider-specific
application (CSS attr-selector for SVG; a JS lookup for canvas). This is what makes
the homepage roadmap chart render green "done" / red "blocked" with no per-chart config.

## Acceptance Criteria
- [x] A `--rf-chart-*` custom-property contract is defined, with Lumina shipping the defaults (palette + geometry + typography/grid) in `chart.css` / tokens.
- [x] The SVG component (`packages/behaviors/src/elements/chart.ts`) reads **every** paint and geometry value from the contract — colours/stroke/font via tagged elements (`.rf-chart__bar`, `data-series`) that CSS paints from the props; layout geometry via `getComputedStyle` of the props. No hardcoded palette or dimensions remain.
- [x] The default series palette is a dedicated chart palette, no longer the semantic status tokens.
- [x] Sentiment colouring works: a chart whose data cells carry `data-meta-sentiment` colours by the semantic tokens (verified on a plan-status aggregate chart).
- [x] `chart` and `aggregate layout="chart"` ({% ref "WORK-349" /%}) both render through this contract identically.
- [x] A theme override (e.g. thicker bars + a custom palette) is demonstrated by setting only `--rf-chart-*` properties — no component or selector changes.
- [x] The contract is documented in SPEC-083 as the **provider-facing interface**; theme-authoring docs cover the `--rf-chart-*` surface.
- [x] Light/dark verified; tests cover palette, geometry, and sentiment modes.

## Approach
Refactor `renderSvg(...)` to (a) tag elements + let `chart.css` paint from the
props, and (b) read geometry props via `getComputedStyle(this)` once per render
with defaults. Keep it a self-contained function (per SPEC-083) so the future
provider extraction (WORK-334) is lift-and-shift — and so the contract it reads is
exactly what other providers will implement.

## References
- `packages/behaviors/src/elements/chart.ts`, `packages/lumina/styles/runes/chart.css`
- Sentiment source: `[data-meta-sentiment]` (metadata dimension)
- Contract home: {% ref "SPEC-083" /%}; honored by future providers ({% ref "WORK-334" /%}); consumed by {% ref "WORK-349" /%}

## Resolution

Completed: 2026-06-08

Branch: `claude/v0.19.0-rollups`

### What was done
- `packages/behaviors/src/elements/chart.ts`: removed the hardcoded `COLORS` array and all inline fill/stroke/dimension. The renderer now emits only tagged elements (`.rf-chart__bar`/`__point`/`__line`/`__axis`/`__label`, each with `data-series` and, from the data cell, `data-meta-sentiment`); reads layout geometry (`bar-ratio`/`thickness`/`gap`, `point-radius`) via `getComputedStyle` with chart.css-matching defaults; `parseTable` captures per-cell `data-meta-sentiment` (value cell, falling back to the label cell).
- `packages/lumina/styles/runes/chart.css`: ships the `--rf-chart-*` contract on `.rf-chart` (dedicated series palette 1–6, geometry, typography/grid) and paints every SVG element from it — series rotation by `data-series`, sentiment override by `data-meta-sentiment` (positive→success, negative→danger, caution→warning, neutral→muted), legend swatches from the palette.
- `packages/runes/src/aggregate-resolve.ts`: fixed `layout="chart"` to emit the chart rune's field channel (`data-rune-fields`) so a non-bar `chart-type` survives the identity transform and `.rf-chart` isn't doubled.
- Docs: SPEC-083 "Shipped surface" table; theme-authoring `css.md` `--rf-chart-*` section with a props-only override demo.
- Tests: 7 new behavior tests (tagging + no-inline-paint, series rotation, geometry read/override via getComputedStyle, point radius, sentiment on value + label cells, axis/label tagging).

### Notes
- `chart` and `aggregate layout="chart"` now render through one renderer + one CSS contract identically (verified: the aggregate chart's `.rf-chart` is single-class and keeps its `data-type`).
- **Sentiment mechanism is complete + unit-tested** (a `data-meta-sentiment` cell → tagged bar → semantic-token paint). The live **plan-status** aggregate chart lights up green-done/red-blocked once {% ref "WORK-357" /%} projects sentiment onto the aggregate's chart cells — same dependency as the plan-progress badges.
- Light/dark: sentiment uses scheme-aware semantic tokens; the series palette is mid-tone hex chosen to read on both. A categorical palette that fully adapts per-scheme can be a later refinement if needed.

{% /work %}
