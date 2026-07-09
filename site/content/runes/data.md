---
title: Data
description: Ingest an external tabular file (CSV, TSV, JSON, NDJSON) and render it as a table, chart, or datatable — shaped at build time
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# Data

Feed charts and sortable tables from real data files instead of hand-typed Markdown tables. The `data` rune reads an external tabular source at build time, shapes it (filter, sort, select, type), and emits a plain `<table>` — which `{% chart %}` and `{% datatable %}` consume with no extra work, and which stands on its own as the no-JS fallback.

{% hint type="note" %}
`data` is an AST preprocessor, like `{% snippet %}`: by the time the transform phase runs, every `{% data %}` tag has been replaced with a Markdoc `table` node. That is why it composes transparently inside `{% chart %}` and `{% datatable %}` — they see an ordinary table, exactly as if you had typed one. The read goes through the same sandbox as snippet (project-root bounded, via the SPEC-113 `ProjectFiles` seam), so `data` is safe on sites that accept untrusted author content and works in fully in-memory/hosted builds.
{% /hint %}

## Ingest a file

The minimum case — a `src` attribute relative to the project root. The format is inferred from the extension.

{% preview source=true %}

{% data src="site/examples/revenue.csv" /%}

{% /preview %}

That is a real file in this repository, read at build time. Change the file and the table updates on the next build — no copy-paste drift. Note the emitted table is a normal table: it renders with or without JavaScript.

## Feeding a chart

Because `chart` treats an authored `<table>` as its single source of truth, dropping a `{% data %}` inside it is all it takes. `numeric` types the value column so the chart plots real numbers (see [Typing](#typing-and-the-data-value-channel)).

{% preview source=true %}

{% chart type="bar" title="Revenue by product" %}
{% data src="site/examples/revenue.csv" columns="product, revenue" numeric="revenue" /%}
{% /chart %}

{% /preview %}

## Feeding a datatable

Same table, handed to `datatable` for runtime search + sort. Typed-numeric columns sort by their real value, not the formatted text (`$1,200` sorts above `$900`, not below it):

{% preview source=true %}

{% datatable sortable="all" searchable=true %}
{% data src="site/examples/revenue.csv" numeric="revenue,units" /%}
{% /datatable %}

{% /preview %}

## Shaping the data

Every knob below runs at **build time** on a single intermediate shape, identically regardless of source format. Order: `where` → `sort` → `columns` → `limit`/`offset`, then typing.

{% preview source=true %}

{% data src="site/examples/revenue.csv"
   where="region:EMEA"
   sort="-units"
   columns="product as Product, units as Units"
   numeric="units" /%}

{% /preview %}

- **`where`** filters rows with the `field:value` grammar (the same one `collection` and `aggregate` use — exact, `glob*`, or `/regex/`). Repeat a field to OR; combine fields to AND.
- **`sort`** orders by a column; a `-` prefix descends. A column whose cells are all numeric (even when formatted, like `$1,200`) sorts numerically.
- **`columns`** selects, reorders, and renames: `"revenue as 'Revenue ($)'"`. Quote an alias that contains spaces or punctuation.
- **`limit`** / **`offset`** slice the rows — the `data` analogue of snippet's `lines=`.

## Typing and the `data-value` channel

A Markdown table carries only text, so a formatted number (`$1,200`, `1,500`, `98%`) is just a string. `numeric` types a column: every value cell keeps its human-formatted text **and** gains a normalized `data-value` (`"$1,200"` → `data-value="1200"`).

That one attribute is the typed channel both host runes honour:

- `chart` reads `data-value` for the plotted number (falling back to the cell text).
- `datatable`'s sort prefers `data-value`, so currency and thousands-separated columns sort correctly.

Auto-inference handles the common case — a column whose non-empty cells all parse as numbers becomes numeric automatically. Use `numeric="col"` to force it (e.g. a column with a few blanks or footnote markers) and `text="col"` to keep something like a zero-padded code (`007`) as text. `data-value` is invisible to a reader of the bare table — a pure enhancement.

## JSON and NDJSON

JSON isn't inherently tabular, so its adapter owns three extra knobs; everything downstream is identical to CSV.

**Nested JSON**, plucked with a `root` locator and dotted column paths:

```markdoc
{% data src="data/api-dump.json" root="data.results" where="region:EMEA"
   columns="product as Product, geo.country as Country, units as Units"
   numeric="units" sort="-units" /%}
```

- **`root`** — a dotted path (`data.results`) or JSON Pointer (`/data/results`) to the array or map inside the document. Defaults to the document itself when it is already an array.
- **`orient`** — how each element maps to a row:
  - `records` (default, auto-detected) — `[{name, revenue}, …]`, keys become headers.
  - `values` (auto-detected) — `[["name","revenue"],["a",10]]`, the first inner array is the header row.
  - `index` (explicit) — `{ "us": {…}, … }`, an object map; the key becomes a column named by **`key-column`**.
- **dotted column paths** — nested fields flatten to dotted headers (`geo.country`), so `columns` plucks them by name.

**Object-map JSON** into a datatable:

```markdoc
{% datatable sortable="all" searchable=true %}
{% data src="data/inventory.json" orient="index" key-column="sku"
   columns="sku as SKU, name as Item, stock as Stock" numeric="stock" /%}
{% /datatable %}
```

**NDJSON** (newline-delimited JSON) parses one record per line; the union of record keys becomes the headers:

```markdoc
{% data src="data/events.ndjson" columns="ts as Time, type as Event" /%}
```

## Build time vs. runtime — `data` and `datatable`

`data`'s `where`/`sort`/`columns` overlap conceptually with what `datatable` offers, but they run at a **different time**, and they compose:

| | `data` | `datatable` |
|---|--------|-------------|
| When | **Build time** | **Runtime** (client-side) |
| Effect | Bakes the shaped rows into the static HTML | Lets the reader filter/sort/paginate live |
| Defines | The no-JS table + what exists on the page | An interactive view over what's there |

Use `data` to scope and type what lands on the page (the honest fallback); wrap it in `datatable` to let readers explore that set. Reach for `data`'s knobs to *remove* rows from the output, and `datatable`'s to let readers *hide* rows they still could reveal.

## Format inference

`format` is inferred from the file extension and can always be overridden.

| Extension | Format |
|-----------|--------|
| `.csv` | `csv` |
| `.tsv` | `tsv` |
| `.json` | `json` |
| `.ndjson`, `.jsonl` | `ndjson` |
| (other) | set `format=` explicitly |

## When something goes wrong

A sandbox escape, a missing file, a parse error, or an empty result renders a visible **error callout** in place of the table and emits a build warning — the build keeps going, and the failure is obvious on the page rather than silently producing a broken table.

## SQLite — a later tier

A SQLite adapter is specified but not yet implemented. It will slot into the same `{ headers, rows }` contract, but it is **active** rather than passive — its path to a result set is a query (`table="sales"` or `query="SELECT …"` with `params` for safe binding), and rows arrive pre-typed. Because a query engine can reach outside the file, the adapter will open the database **read-only**, **disable extension loading**, and **reject `ATTACH` / file-touching pragmas** on top of the path sandbox — build-time only, never exposed to the client. Tracked as its own work item.

## Attributes

### Core

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `src` | String | Yes | Path to the source file, relative to the project root (sandboxed). |
| `format` | String | No | `csv` \| `tsv` \| `json` \| `ndjson`. Inferred from the extension; override for ambiguity. |

### CSV / TSV

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `delimiter` | String | No | Override the field separator. |
| `header` | Boolean | No | Whether the first row is the header (default `true`). `false` synthesizes `col1…`. |

### JSON

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `root` | String | No | Dotted path / JSON Pointer to the array or map within the document. |
| `orient` | String | No | `records` \| `values` \| `index`. `records`/`values` auto-detected; `index` is explicit. |
| `key-column` | String | No | When `orient=index`, the header for the synthesized key column (default `key`). |

### Shared (all formats)

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `columns` | String | No | Select + order + rename: `"name as Product, revenue as 'Revenue ($)'"`. Dotted paths for JSON. |
| `where` | String | No | Filter rows with the `field:value` grammar. |
| `sort` | String | No | Sort by a column; `-` prefix descends. |
| `limit` | Number | No | Maximum number of rows. |
| `offset` | Number | No | Skip this many rows before limiting. |
| `numeric` | String | No | Comma-separated columns to force to numeric typing (emits `data-value`). |
| `text` | String | No | Comma-separated columns to force to text typing. |

## See also

- [Chart](/runes/chart) — plots the emitted table; reads `data-value` for real numbers.
- [Datatable](/runes/datatable) — runtime search/sort over the emitted table; sorts on `data-value`.
- [Snippet](/runes/snippet) — the sibling preprocess rune (a file → a code fence).
- [Hosted & in-memory builds](/extend/plugin-authoring/hosted-builds) — the `ProjectFiles` sandbox `data`'s `src` reads through.
