{% spec id="SPEC-103" status="draft" source="SPEC-062" tags="runes,data,chart,datatable,csv,json,sqlite,pipeline,preprocess,sandbox" %}

# `data` rune — external tabular sources

A preprocess-time rune that reads an **external tabular source** (CSV, JSON,
NDJSON; SQLite later) and emits a Markdoc `table` AST node. Because `chart`
({% ref "SPEC-083" /%}) and `datatable` both already treat an authored `<table>`
as their single source of truth, a table-emitting `data` rune feeds **both** —
plus the bare page — with **zero changes to either host rune**. It is the
external-source sibling of {% ref "SPEC-062" /%} (`snippet`, which emits a
`fence`) and the external-source complement to `aggregate`/{% ref "SPEC-093" /%}
(which project the *internal* registry).

Target: next minor (post-v0.21.0).

## Motivation

Authors want charts and sortable tables fed from real data files, not hand-typed
Markdown tables. The naive path — teach `chart` and `datatable` to parse CSV out
of a code block — duplicates ingestion in every consumer and erodes the
"`<table>` is the source of truth / no-JS fallback" invariant from
{% ref "SPEC-083" /%}.

Inverting the factoring removes that cost. `snippet` already proves the pattern:
a **preprocess hook** resolves a sandboxed file and replaces the tag with a
standard AST node (`fence`), which container runes then consume transparently.
`data` does the same, targeting a **`table`** node instead. The host runes stay
dumb; one preprocessor feeds them all; the emitted table *is* the honest
fallback for free.

## Axis: where `data` sits

| Rune | Source | Output | Render targets |
|------|--------|--------|----------------|
| `aggregate` ({% ref "SPEC-093" /%} family) | **internal** registry | numbers | inline / body / `chart` |
| **`data` (this spec)** | **external** file | a `<table>` | bare / `chart` / `datatable` |

Non-overlapping. `aggregate` answers "summarise what the site already knows";
`data` answers "ingest a file the site doesn't model."

## Architecture — one intermediate shape

Formats must not leak past the front door. Every source collapses to a single
intermediate shape, and every knob downstream is format-agnostic:

```
src + format ──▶ [format adapter] ──▶ { headers: string[], rows: Cell[][] }
                                              │
                       [shared projection: where → sort → columns → limit/offset]
                                              │
                              [shared typing: numeric / text coercion]
                                              │
                                  [emit Markdoc `table` AST node]
```

A **format adapter** has exactly one job: get raw bytes to `{ headers, rows }`.
That is the *only* place format-specific knobs live. Everything after the
adapter — filtering, selection/rename, sorting, slicing, typing — is shared and
identical regardless of source. Adding a new format is one adapter, no changes
to the projection core or the host runes.

The preprocess hook resolves `src` through the **same sandbox boundary as
snippet** (`readSnippetFile`, bounded to project root; variable references in
attributes resolve via `ctx.variables`, mirroring snippet). On any failure
(sandbox escape, missing file, parse error) it emits a visible error node and
keeps the build going — it never reaches a transform that throws.

## The `data` rune — knobs

| Knob | Scope | Purpose |
|------|-------|---------|
| `src` | core | Sandboxed path (snippet boundary). Required. |
| `format` | core | `csv` \| `tsv` \| `json` \| `ndjson` (\| `sqlite` later). Inferred from extension, overridable. |
| `delimiter` | csv/tsv | Override the separator. |
| `header` | csv/tsv | First row is the header (default `true`); `false` synthesizes `col1…`. |
| `root` | json | Dotted path / JSON Pointer to the array or map within the document. |
| `orient` | json | `records` \| `values` \| `index`. Auto-detected; override for ambiguity. |
| `key-column` | json | When `orient=index`, the header for the synthesized key column. |
| `columns` | shared | Select + order + rename: `"name as Product, revenue as 'Revenue ($)'"`. Dotted paths for JSON (`geo.country`). |
| `where` | shared | Filter rows; reuse the SPEC-070 `field:value` grammar (consistency with `aggregate`/`collection`). |
| `sort` | shared | `revenue` / `-revenue`. |
| `limit` / `offset` | shared | Row slice (the `data` analogue of snippet's `lines=`). |
| `numeric` / `text` | shared | Force column typing. Auto-infer by default (a column whose cells all parse as numbers becomes numeric). Critical: charts need real numbers for value axes; `datatable` needs them for correct sort. |

## JSON adapter specifics

JSON is not inherently tabular, so its adapter owns the three knobs CSV doesn't:

- **`root`** — where the array/map lives (`root="data.results"`). Defaults to the
  document itself when it is already an array.
- **`orient`** — how each element maps to a row:
  - `records` (default, auto-detected): `[{name, revenue}, …]` → keys are headers.
  - `values`: `[["name","revenue"],["a",10]]` → first inner array is the header.
  - `index`: `{ "us": {…}, … }` → object map; the key becomes a column (`key-column`).
  Auto-detection covers `records` vs `values` (is `element[0]` an object or an
  array); `index` requires the explicit flag because intent is ambiguous.
- **dotted column paths** in `columns` to pluck nested fields.

Once the adapter yields `{ headers, rows }`, JSON is indistinguishable from CSV
downstream.

## Worked examples

**CSV → chart** (zero chart changes; `numeric` makes the value axis real):

```markdoc
{% chart type="line" title="Monthly revenue" %}
{% data src="./data/revenue.csv" numeric="revenue" /%}
{% /chart %}
```

**Nested JSON → table**, plucked + filtered + sorted:

```markdoc
{% data src="./data/api-dump.json" root="data.results" where="region:EMEA"
   columns="product as Product, geo.country as Country, units as Units"
   numeric="units" sort="-units" /%}
```

**Object-map JSON → datatable**:

```markdoc
{% datatable sortable="all" searchable=true %}
{% data src="./data/inventory.json" orient="index" key-column="sku"
   columns="sku as SKU, name as Item, stock as Stock" numeric="stock" /%}
{% /datatable %}
```

## Composition + the build-time / runtime line

`where`/`sort`/`columns` overlap conceptually with what `datatable` does at
runtime, but at a different *time*: `data` shapes at **build time**
(deterministic, baked into the static HTML, defines the no-JS table);
`datatable` filters at **runtime** (client-side, interactive). They compose —
`data` scopes what exists on the page, `datatable` lets the reader explore it.
Docs must draw this line so authors don't reach for the wrong layer.

## SQLite — later adapter tier

SQLite slots into the same `{ headers, rows }` contract but is **active**, not
passive: its path to a result set is a *query*, and rows arrive **pre-typed**
(`INTEGER`/`REAL` → JS numbers, so `numeric` is usually moot).

- Source knobs: `table="sales"` (≡ `SELECT * FROM sales`) or `query="SELECT …"`;
  `params` for safe value binding (and a natural home for frontmatter variables).
- The shared projection knobs become **advisory** here — SQL already does
  `where`/`sort`/`limit`/select/rename. Idiom: shape in SQL; the shared knobs
  still run as post-result filters for consistency.
- **New sandbox surface.** Unlike byte-reading adapters, SQLite executes a query
  engine that can reach outside the file (`ATTACH`, file-touching `PRAGMA`s,
  loadable extensions). The adapter MUST open the database **read-only**,
  **disable extension loading**, and **reject `ATTACH`/file pragmas**, on top of
  the path sandbox. Build-time only (`node:sqlite` / `better-sqlite3`) — no
  client exposure, preserving the no-JS-fallback invariant.

Scoped behind the CSV/JSON tier; a future "SQL over CSV/JSON" (DuckDB-style) mode
then becomes a small extension rather than a new concept.

## Acceptance Criteria

- [ ] A `{% data src=… /%}` rune resolves its source via the snippet sandbox
  boundary (`readSnippetFile`, project-root bounded; `ctx.variables` resolution)
  in a preprocess hook, and emits a Markdoc `table` AST node.
- [ ] The emitted `<table>` is consumed unchanged by `chart` and `datatable`
  (no edits to either host rune) and renders standalone on a bare page.
- [ ] Format adapters for `csv`/`tsv`, `json`, and `ndjson` reduce their source
  to a shared `{ headers, rows }` shape; `format` is extension-inferred and
  overridable.
- [ ] JSON adapter supports `root`, `orient` (`records`|`values`|`index`,
  with `records`/`values` auto-detected), `key-column`, and dotted column paths.
- [ ] Shared projection (`where` via SPEC-070 grammar, `sort`, `columns` with
  select/order/rename, `limit`/`offset`) and typing (`numeric`/`text` with
  auto-inference) run identically across all adapters.
- [ ] Resolution failures emit a visible in-page error node and a build warning;
  the build continues (the rune never reaches the throwing transform).
- [ ] Docs page for `data` with CSV + JSON examples, the chart/datatable
  composition story, and the build-time-vs-runtime distinction; CSS coverage and
  unit tests for adapters + projection + typing inference.
- [ ] SQLite is documented as a later adapter tier with its read-only / no-extension
  / no-`ATTACH` sandbox requirements (implementation deferred to its own work item).

## Non-goals

- **Remote / live data** — no build-time URL fetch and no client-side fetch in
  this spec; build-time local files only. A remote tier is a later, opt-in spec
  (network reproducibility, caching, secrets).
- **Modifying `chart`/`datatable`** — the whole point is that they need no changes.
- **A query language of our own** — `where`/`sort` reuse the existing SPEC-070
  grammar; SQL belongs to the SQLite adapter, not the rune surface.
- **SQLite implementation** — specified here, built in a dedicated follow-up.

## References

- {% ref "SPEC-062" /%} — `snippet` preprocess pattern (sandboxed file → AST node) this extends; `packages/runes/src/snippet-pipeline.ts`, `lib/read-file.ts`.
- {% ref "SPEC-083" /%} — `chart`: the authored `<table>` as single source of truth + no-JS fallback.
- {% ref "SPEC-093" /%} — data-bound sandbox: the *internal* (registry) projection axis this complements.
- SPEC-070 — the `field:value` query grammar reused by `where`.
- `packages/runes/src/tags/{chart,datatable}.ts` — the unchanged host runes.

{% /spec %}
