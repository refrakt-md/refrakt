{% work id="WORK-417" status="ready" priority="high" complexity="complex" source="SPEC-103" milestone="v0.27.0" tags="runes,data,csv,json,pipeline,preprocess,chart,datatable" %}

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

- [ ] `{% data src="./x.csv" /%}` resolves via the {% ref "SPEC-113" /%} `ProjectFiles` seam in a preprocess hook and emits a Markdoc `table` node; `src` escaping the project root errors visibly (callout) without crashing the build.
- [ ] The emitted `<table>` is consumed by `{% chart %}` (renders `<rf-chart>`) and `{% datatable %}` with **no structural edits** to `tags/chart.ts` or `tags/datatable.ts`, and renders standalone.
- [ ] CSV/TSV adapter honors `delimiter` and `header` (false → synthesized `col1…`) to the `{ headers, rows }` contract; `format` is extension-inferred and overridable.
- [ ] Shared `where`/`sort`/`columns`(select+order+rename)/`limit`/`offset` and `numeric`/`text` typing (auto-inference) run on the intermediate shape; typed-numeric columns emit `data-value` on value cells.
- [ ] An unknown / parse-failing / empty source emits an in-page error callout + build warning and the build continues.
- [ ] `refrakt inspect data` and the contracts generator read the schema; unit tests cover the CSV/TSV adapter, projection, typing inference + `data-value`, the `ProjectFiles` boundary, and chart/datatable composition.

## Dependencies

- {% ref "WORK-481" /%} — the `ProjectFiles` seam `src` resolves through (land 113's read contract first; see {% ref "SPEC-103" /%} *Sequencing with SPEC-113*).

(WORK-487, the datatable `data-value` sort, is a sibling that pairs with this item to complete the typing story end-to-end, but is not a blocking dependency.)

## References

- {% ref "SPEC-103" /%} — architecture, knobs, typing channel, sequencing.
- {% ref "SPEC-062" /%} — snippet preprocess prior art: `packages/runes/src/snippet-pipeline.ts`, `corePipelineHooks` wiring in `config.ts`.
- {% ref "SPEC-113" /%} — the `ProjectFiles` seam.
- `packages/runes/src/tags/{chart,datatable}.ts` — host runes (structure unchanged); `packages/runes/src/field-match.ts` — reused `parseFieldMatch`/`matchValue`.

{% /work %}
