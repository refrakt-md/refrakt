{% work id="WORK-417" status="done" priority="high" complexity="complex" source="SPEC-103" milestone="v0.27.0" tags="runes,data,csv,json,pipeline,preprocess,chart,datatable" %}

# `data` rune preprocessor + CSV/TSV adapter + projection core

The tier-1 spine of {% ref "SPEC-103" /%}: a preprocess-time `data` rune that reads a sandboxed
external file and emits a Markdoc `table` AST node, the **CSV/TSV** adapter, and the shared
projection + typing core (incl. `data-value` emission) and table emitter that every adapter
reuses. JSON/NDJSON adapters (WORK-486), the datatable sort change (WORK-487), SQLite, and
remote sources are out of scope. Proves the headline claim — `chart` and `datatable` consume the
emitted `<table>` with **no structural edits**.

## Scope

- **Preprocess hook** — a sibling to `preprocessSnippets` (`packages/runes/src/snippet-pipeline.ts`): walk the AST, resolve each `{% data %}` tag's `src` through the {% ref "SPEC-113" /%} `ProjectFiles` seam ({% ref "WORK-481" /%}; project-root bounded, whole-file read, `ctx.variables` attribute resolution), run the adapter + projection, and replace the tag with a `table` Ast.Node. Register in `corePipelineHooks.preprocess` alongside snippet.
- **Rune schema** — `packages/runes/src/tags/data.ts` via `createContentModelSchema`, declaring the full SPEC-103 attribute set. Like snippet, its `transform` is unreachable in normal operation and throws a clear "preprocess hook not wired" error; the schema exists for `inspect`/contracts/validation.
- **CSV/TSV adapter** — to the `{ headers: string[], rows: Cell[][] }` contract: `delimiter` override, `header` (false → synthesized `col1…`). `format` extension-inferred, overridable. (JSON/NDJSON adapters land in WORK-486 against this same contract.)
- **Shared projection + typing** — format-agnostic, on the intermediate shape: `where` (reuse the SPEC-070 `parseFieldMatch` + `matchValue` primitives with a row-shaped field resolver paralleling `resolveEntityField`), `sort` (`-` prefix = desc), `columns` (select + order + `as` rename, dotted-path aware), `limit`/`offset`; then typing — auto-infer numeric columns (all cells parse as numbers) with `numeric`/`text` overrides.
- **`data-value` emission** — typed-numeric columns emit a normalized `data-value` on each value cell (`"$1,200"` → `data-value="1200"`); `chart` consumes it via `parseFloat`, and `datatable` once WORK-487 lands. The bare `<table>` stays the honest no-JS fallback.
- **Table emitter** — build the Markdoc `table` node (`thead`/`tbody`) the existing table transform styles, so `chart` (`findTable`) and `datatable` (its `table`/`rf-table-wrapper` lookup) pick it up unchanged.
- **Error path** — sandbox escape / missing file / parse error / empty result emits a visible in-page **error callout** (not a malformed table) + `ctx.error` warning; the build continues (mirror `makeErrorFence`).

## Acceptance Criteria

- [x] `{% data src="./x.csv" /%}` resolves via the {% ref "SPEC-113" /%} `ProjectFiles` seam in a preprocess hook and emits a Markdoc `table` node; `src` escaping the project root errors visibly (callout) without crashing the build.
- [x] The emitted `<table>` is consumed by `{% chart %}` (renders `<rf-chart>`) and `{% datatable %}` with **no structural edits** to `tags/chart.ts` or `tags/datatable.ts`, and renders standalone.
- [x] CSV/TSV adapter honors `delimiter` and `header` (false → synthesized `col1…`) to the `{ headers, rows }` contract; `format` is extension-inferred and overridable.
- [x] Shared `where`/`sort`/`columns`(select+order+rename)/`limit`/`offset` and `numeric`/`text` typing (auto-inference) run on the intermediate shape; typed-numeric columns emit `data-value` on value cells.
- [x] An unknown / parse-failing / empty source emits an in-page error callout + build warning and the build continues.
- [x] `refrakt inspect data` and the contracts generator read the schema; unit tests cover the CSV/TSV adapter, projection, typing inference + `data-value`, the `ProjectFiles` boundary, and chart/datatable composition.

## Dependencies

- {% ref "WORK-481" /%} — the `ProjectFiles` seam `src` resolves through (land 113's read contract first; see {% ref "SPEC-103" /%} *Sequencing with SPEC-113*).

(WORK-487, the datatable `data-value` sort, is a sibling that pairs with this item to complete the typing story end-to-end, but is not a blocking dependency.)

## References

- {% ref "SPEC-103" /%} — architecture, knobs, typing channel, sequencing.
- {% ref "SPEC-062" /%} — snippet preprocess prior art: `packages/runes/src/snippet-pipeline.ts`, `corePipelineHooks` wiring in `config.ts`.
- {% ref "SPEC-113" /%} — the `ProjectFiles` seam.
- `packages/runes/src/tags/{chart,datatable}.ts` — host runes (structure unchanged); `packages/runes/src/field-match.ts` — reused `parseFieldMatch`/`matchValue`.

## Resolution

Completed: 2026-06-30

Branch: `claude/spec-103-data-rune`

### What was done
The tier-1 spine of SPEC-103 — a preprocess-time `data` rune that reads an external CSV/TSV file and emits a Markdoc `table` node `chart`/`datatable` consume unchanged.
- `data-adapters.ts` — dependency-free RFC-4180 delimited parser + CSV/TSV adapter to the `{ headers, rows }` contract (`delimiter`/`header` knobs, ragged-row padding); `inferFormat` (extension → format); `DataSourceError`.
- `data-projection.ts` — shared, format-agnostic projection: `applyWhere` (reuses `parseFieldMatch` + the now-exported `matchValue` with a row resolver), `applySort` (`-` desc; numeric detection on formatted columns), `applyColumns` (select/order/rename, returns source mapping), `applyLimitOffset`, `applyTyping` (auto-infer numeric, `numeric`/`text` overrides by source **or** renamed name), `normalizeNumber` (`"$1,200"` → `1200`).
- `data-emit.ts` — builds the Markdoc `table` AST node; numeric value cells carry `data-value`; the error path emits a `hint` callout (not a malformed table).
- `data-pipeline.ts` — `preprocessData`: walk AST, resolve `{% data %}` `src` through `ctx.sandbox` (the SPEC-113 `ProjectFiles` seam, whole-file read, `ctx.variables` resolution), run adapter → projection → typing → emit; any failure → callout + `ctx.error`, build continues.
- `tags/data.ts` — the rune schema (full SPEC-103 attribute surface; throwing transform, mirroring snippet).
- `nodes.ts` + `index.ts` — a `td` node that forwards `data-value` (additive; hand-authored cells unchanged), registered in the `nodes` map.
- `config.ts` — `Data: { block: 'data' }` engine entry; core `preprocess` now composes snippet then data over the same AST.
- `index.ts` — `data` catalog entry (`defineRune`).

### Notes
- **No structural edits to `chart.ts` / `datatable.ts`** — they find the emitted `div.rf-table-wrapper > table` unchanged (tests confirm `rf-chart` / `data-table` composition and that `data-value` survives into the chart's table).
- The `data-value` channel is delivered by extending the shared `td` node, so it also benefits hand-authored tables — exactly what the spec intends (and what WORK-487's datatable sort will read).
- JSON/NDJSON adapters are stubbed to a clear in-page error (land in WORK-486); the projection/typing/emit core is shared and format-agnostic.
- Tests: `data-rune.test.ts` (17 — end-to-end CSV/TSV, where/sort/columns/limit/typing/data-value, chart + datatable composition, error/containment paths) and `data-adapters.test.ts` (20 — RFC-4180 quoting edge cases, number normalization, inference). CSS-coverage: `data` added to UNSTYLED_BLOCKS (plain table, no own element). Contracts regenerated. `inspect --list` shows `data`; `inspect data` is at parity with `inspect snippet`. Full monorepo builds green; runes/content/plan/cli/lumina suites pass.

{% /work %}
