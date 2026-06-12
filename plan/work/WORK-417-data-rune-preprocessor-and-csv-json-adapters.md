{% work id="WORK-417" status="ready" priority="high" complexity="complex" source="SPEC-103" tags="runes,data,csv,json,pipeline,preprocess,chart,datatable" milestone="v0.22.0" %}

# `data` rune preprocessor + CSV/JSON adapters

The tier-1 foundation of {% ref "SPEC-103" /%}: a preprocess-time `data` rune that
reads a sandboxed external file and emits a Markdoc `table` AST node, plus the
CSV/TSV/JSON/NDJSON adapters and the shared projection/typing core. SQLite and any
remote source are explicitly out of scope (later work items). Proves the headline
claim — `chart` and `datatable` consume the emitted `<table>` with **no edits**.

## Scope

- **Preprocess hook** — a sibling to `preprocessSnippets` (`packages/runes/src/snippet-pipeline.ts`): walk the AST, resolve each `{% data %}` tag's `src` through the **existing snippet sandbox** (`readSnippetFile`, project-root bounded; attribute `ctx.variables` resolution), run the adapter + projection, and replace the tag with a `table` Ast.Node. Register in `corePipelineHooks.preprocess` alongside snippet.
- **Rune schema** — `packages/runes/src/tags/data.ts` via `createContentModelSchema`, declaring the SPEC-103 attributes (`src`, `format`, `delimiter`, `header`, `root`, `orient`, `key-column`, `columns`, `where`, `sort`, `limit`, `offset`, `numeric`, `text`). Like snippet, its `transform` is unreachable in normal operation and throws a clear "preprocess hook not wired" error; the schema exists for `inspect`/contracts/validation.
- **Adapter contract** — `{ headers: string[], rows: Cell[][] }`. One adapter each for `csv`/`tsv` (delimiter + `header`), `json` (`root`, `orient` records|values|index with records/values auto-detected, `key-column`, dotted paths), and `ndjson`. `format` extension-inferred (reuse `inferLanguage`-style mapping), overridable.
- **Shared projection + typing** — format-agnostic, run on the intermediate shape for every adapter: `where` (reuse the SPEC-070 `field:value` parser), `sort` (`-` prefix = desc), `columns` (select + order + `as` rename, dotted-path aware), `limit`/`offset`; then typing — auto-infer numeric columns (all cells parse as numbers) with `numeric`/`text` overrides.
- **Table emitter** — build the Markdoc `table` node (`thead`/`tbody`) the existing table transform already styles, so `chart` (`findTable`) and `datatable` (its `table`/`rf-table-wrapper` lookup) pick it up unchanged.
- **Error path** — sandbox escape / missing file / parse error / empty result emits a visible in-page error node + `ctx.error` warning; the build continues (mirror `makeErrorFence`).

## Acceptance Criteria

- [ ] `{% data src="./x.csv" /%}` resolves via the snippet sandbox in a preprocess hook and emits a Markdoc `table` node; `src` escaping the project root errors visibly without crashing the build.
- [ ] The emitted `<table>` is consumed unchanged by `{% chart %}` (renders `<rf-chart>`) and `{% datatable %}` (sortable/searchable), and renders standalone — no edits to `tags/chart.ts` or `tags/datatable.ts`.
- [ ] CSV/TSV adapter honors `delimiter` and `header` (false → synthesized `col1…`); JSON adapter honors `root`, `orient` (`records`/`values` auto-detected, `index` + `key-column`), and dotted column paths; NDJSON adapter parses line-delimited records.
- [ ] Shared `where`/`sort`/`columns`(select+order+rename)/`limit`/`offset` and `numeric`/`text` typing (with auto-inference) run identically across all adapters on the `{ headers, rows }` intermediate.
- [ ] `format` is inferred from the file extension and overridable; an unknown/parse-failing source emits an in-page error node + build warning and the build continues.
- [ ] `refrakt inspect data` and the contracts generator read the schema; unit tests cover each adapter, projection, typing inference, the sandbox boundary, and chart/datatable composition; a `data` docs page with CSV + JSON examples and the build-time-vs-runtime note.

## References

- {% ref "SPEC-103" /%} — the spec (architecture, knobs, JSON specifics, axis vs `aggregate`).
- {% ref "SPEC-062" /%} — snippet preprocess prior art: `packages/runes/src/snippet-pipeline.ts`, `lib/read-file.ts` (`readSnippetFile`), `corePipelineHooks` wiring in `config.ts`.
- `packages/runes/src/tags/{chart,datatable}.ts` — the host runes that stay unchanged (`findTable` / `rf-table-wrapper` lookup).
- SPEC-070 — the `field:value` grammar reused by `where`.

{% /work %}
