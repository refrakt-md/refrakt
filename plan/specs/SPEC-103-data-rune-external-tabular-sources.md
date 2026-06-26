{% spec id="SPEC-103" status="accepted" source="SPEC-062" tags="runes,data,chart,datatable,csv,json,sqlite,pipeline,preprocess,sandbox" %}

# `data` rune — external tabular sources

A preprocess-time rune that reads an **external tabular source** (CSV, JSON,
NDJSON; SQLite later) and emits a Markdoc `table` AST node. Because `chart`
({% ref "SPEC-083" /%}) and `datatable` both already treat an authored `<table>`
as their single source of truth, a table-emitting `data` rune feeds **both** —
plus the bare page — with **no structural changes to either host rune** (typing
adds one small `data-value`-aware sort to `datatable`; see *Typing & the
`data-value` channel*). It is the
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

The preprocess hook resolves `src` through the project's sandboxed file access,
bounded to project root; variable references in attributes resolve via
`ctx.variables`, mirroring snippet. This read MUST go through the
{% ref "SPEC-113" /%} `ProjectFiles` seam — a **whole-file** read, not snippet's
line-sliced `readSnippetFile` — so `data` inherits containment and is
hosted / fs-free from day one (see *Sequencing with SPEC-113*). On any failure
(sandbox escape, missing file, parse error) it emits a visible in-page error
node — an **error callout, not a malformed table** — and keeps the build going:
it never reaches a transform that throws.

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
| `numeric` / `text` | shared | Force column typing. Auto-infer by default (a column whose cells all parse as numbers becomes numeric). Typed columns emit a normalized `data-value` on each value cell (see *Typing & the `data-value` channel*) — that is what carries a clean number to `chart`'s renderer and `datatable`'s sort, independent of the human-formatted cell text. |

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

## Typing & the `data-value` channel

Structure composes for free; **typing does not**. A Markdoc `table` carries only
text, and the two host runes have *unequal* native typing (verified in code):

- `chart` already coerces value cells (`parseFloat`) and honours a per-cell
  **`data-value`** override — `cellValue = cell.dataset.value ?? textContent`
  (`packages/behaviors/src/elements/chart.ts`).
- `datatable` sorts on cell **text** via `localeCompare(…, { numeric: true })`
  (`packages/behaviors/src/behaviors/datatable.ts`) — natural-numeric collation,
  but it reads no per-column type and no `data-value`.

So `numeric`/`text` cannot be a pure structural transform. A column typed numeric
emits a normalized **`data-value`** on each value cell (e.g. `"$1,200"` →
`data-value="1200"`). `chart` consumes that unchanged. For `datatable`, correct
sort of *human-formatted* numbers (currency, thousands separators, units)
requires its sort comparator to **prefer `data-value` over `textContent`** — a
small, additive change to the datatable behaviour, mirroring what `chart` already
does. We take that change deliberately: a `data-value`-aware sort also fixes
**hand-authored** tables, so it is a general improvement, not a `data`-specific
hack.

This narrows the "zero changes to host runes" claim to its true scope:
**structure** needs zero changes (a table is a table); **typing** adds one
universal cell-level channel (`data-value`) that `chart` already honours and
`datatable` is extended once to honour. The emitted `<table>` stays the honest
no-JS fallback either way — `data-value` is an enhancement attribute, invisible
to a reader of the bare table.

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

## Sequencing with SPEC-113

`data`'s `src` read is exactly the kind of ad-hoc file access
{% ref "SPEC-113" /%} consolidates behind `ProjectFiles`. Land 113's read
contract first (or at least its interface) and build `data` against
`ProjectFiles` directly — do **not** add a fresh `node:fs` / `readSnippetFile`
consumer that 113 then has to migrate. This keeps `data` fs-free and
hosted-ready from day one, which is the whole point of pairing the two threads in
this milestone. If they must overlap, `data` may begin against the existing
sandbox-hook shape and switch to `ProjectFiles` as 113 lands.

## Acceptance Criteria

- [ ] A `{% data src=… /%}` rune resolves its source via the {% ref "SPEC-113" /%}
  `ProjectFiles` seam (project-root bounded, whole-file read; `ctx.variables`
  resolution) in a preprocess hook, and emits a Markdoc `table` AST node.
- [ ] The emitted `<table>` is consumed by `chart` and `datatable` with **no
  structural changes** to either host rune, and renders standalone on a bare
  page. Typed columns emit `data-value` on value cells; `chart` consumes it
  unchanged, and `datatable`'s sort comparator is extended once to prefer
  `data-value` over cell text (the only host-side change, and one that also
  benefits hand-authored tables).
- [ ] Format adapters for `csv`/`tsv`, `json`, and `ndjson` reduce their source
  to a shared `{ headers, rows }` shape; `format` is extension-inferred and
  overridable.
- [ ] JSON adapter supports `root`, `orient` (`records`|`values`|`index`,
  with `records`/`values` auto-detected), `key-column`, and dotted column paths.
- [ ] Shared projection (`where` reusing the SPEC-070 `parseFieldMatch` +
  `matchValue` primitives with a row-shaped field resolver paralleling
  `resolveEntityField`; `sort`; `columns` with select/order/rename;
  `limit`/`offset`) and typing (`numeric`/`text` with auto-inference, emitting
  `data-value`) run identically across all adapters.
- [ ] Resolution failures emit a visible in-page error node and a build warning;
  the build continues (the rune never reaches the throwing transform).
- [ ] Docs page for `data` with CSV + JSON examples, the chart/datatable
  composition story, and the build-time-vs-runtime distinction; CSS coverage and
  unit tests for adapters + projection + typing inference.
- [ ] SQLite is documented as a later adapter tier with its read-only / no-extension
  / no-`ATTACH` sandbox requirements (implementation deferred to its own work item).

## Non-goals

- **Remote / live data** — no build-time URL fetch and no client-side fetch in
  this spec; build-time local files only. Note this is a *scoping* choice, not an
  architectural limit: the `data` preprocessor runs in the already-async
  preprocess phase, so a build-time fetch could `await` without any pipeline
  change. A remote tier is deferred to its own opt-in spec for the reasons that
  actually make it hard — network reproducibility, caching, secrets.
- **Restructuring `chart`/`datatable`** — no *structural* changes: both consume
  the emitted `<table>` as-is. The one exception is typing — `datatable`'s sort
  comparator gains a `data-value` preference (additive, also fixes hand-authored
  tables; see *Typing & the `data-value` channel*). `chart` needs no change.
- **A query language of our own** — `where`/`sort` reuse the existing SPEC-070
  grammar; SQL belongs to the SQLite adapter, not the rune surface.
- **SQLite implementation** — specified here, built in a dedicated follow-up.

## References

- {% ref "SPEC-062" /%} — `snippet` preprocess pattern (sandboxed file → AST node) this extends; `packages/runes/src/snippet-pipeline.ts`, `lib/read-file.ts`.
- {% ref "SPEC-083" /%} — `chart`: the authored `<table>` as single source of truth + no-JS fallback.
- {% ref "SPEC-093" /%} — data-bound sandbox: the *internal* (registry) projection axis this complements.
- SPEC-070 — the `field:value` query grammar reused by `where`; shape-agnostic
  primitives in `packages/runes/src/field-match.ts` (`parseFieldMatch`,
  `matchValue`) reused as-is, with a row-shaped resolver paralleling
  `resolveEntityField`.
- {% ref "SPEC-113" /%} — the `ProjectFiles` seam `data`'s `src` read goes
  through (see *Sequencing with SPEC-113*).
- `packages/runes/src/tags/{chart,datatable}.ts` — the host runes (structure
  unchanged; `datatable` gains a `data-value`-aware sort).
- `packages/behaviors/src/elements/chart.ts` (`data-value` parsing) and
  `packages/behaviors/src/behaviors/datatable.ts` (the sort comparator extended
  to prefer `data-value`).

{% /spec %}
