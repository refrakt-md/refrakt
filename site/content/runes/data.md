---
title: Data
description: Ingest an external tabular file (CSV, TSV, JSON, NDJSON) and render it as a table, chart, or datatable — shaped at build time
category: Data
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:data"} /%}

Feed tables, charts and sortable tables from real data files instead of hand-typed Markdown tables. `data` reads a file from your project at build time, filters, sorts and selects its rows, and renders a plain table. That table works without JavaScript, and `{% chart %}` and `{% datatable %}` take it like one you typed.

## Basic usage

`src` is relative to the project root. The format comes from the extension: `.csv`, `.tsv`, `.json`, and `.ndjson` or `.jsonl`; for anything else, set `format`.

{% preview source=true %}

	{% data src="site/examples/revenue.csv" /%}

{% /preview %}

Change the file and the table updates on the next build.

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| No body | A table of the shaped rows |
| A body | A template rendered once per row, with `$row` bound ([Render each row with a template](#render-each-row-with-a-template)) |
| A `---` in the body, when `headers` is set | A cell boundary: the body becomes one table row, a cell per zone ([A table with formatted cells](#a-table-with-formatted-cells)) |

## Filter, sort and pick columns

These run at build time, in this order: `where`, `sort`, `columns`, then `limit` and `offset`.

{% preview source=true %}

	{% data src="site/examples/revenue.csv"
	   where="region:EMEA"
	   sort="-units"
	   columns="product as Product, units as Units"
	   numeric="units" /%}

{% /preview %}

- **`where`** filters with the `field:value` form [collection](/runes/collection) uses: exact, `glob*`, or `/regex/`. Repeat a field for OR; combine fields for AND.
- **`sort`** orders by a column; a `-` prefix sorts descending.
- **`columns`** selects, reorders, and renames. Quote an alias with spaces or punctuation: `"revenue as 'Revenue ($)'"`.
- **`limit`** and **`offset`** take a slice of the rows.

## Treat a column as numbers

A column whose cells all read as numbers, even formatted ones like `$1,200` or `98%`, is numeric automatically: it sorts by value, a chart plots it, and the reader still sees the formatted text. Use `numeric="col"` to force it, for a column with a few blanks or footnote markers, and `text="col"` to keep a code like `007` as text.

## Feed a chart

Put `data` inside `{% chart %}`:

{% preview source=true %}

	{% chart type="bar" title="Revenue by product" %}
		{% data src="site/examples/revenue.csv" columns="product, revenue" numeric="revenue" /%}
	{% /chart %}

{% /preview %}

## Let readers search and sort

Put `data` inside `{% datatable %}`. Numeric columns sort by value, so `$1,200` sorts above `$900`.

{% preview source=true %}

	{% datatable sortable="all" searchable=true %}
		{% data src="site/examples/revenue.csv" numeric="revenue,units" /%}
	{% /datatable %}

{% /preview %}

`data` decides at build time which rows are on the page at all; `datatable` lets readers hide and reorder those rows in the browser. Filter with `where` to leave rows out, and with the datatable's search to let readers narrow them.

## Read nested JSON

Point `root` at the array or object inside the document, as a dotted path (`data.results`) or a JSON Pointer (`/data/results`). Nested fields become dotted column names, which `columns` can pick:

```markdoc
{% data src="data/api-dump.json" root="data.results" where="region:EMEA"
   columns="product as Product, geo.country as Country, units as Units"
   numeric="units" sort="-units" /%}
```

`orient` says how each element becomes a row:

- `records` (detected): `[{name, revenue}, …]`; the keys become columns.
- `values` (detected): `[["name","revenue"],["a",10]]`; the first array is the header row.
- `index`: `{ "us": {…}, … }`; each key becomes a column named by `key-column`.

NDJSON reads one record per line, and every key that appears in any record becomes a column.

## Render each row with a template

Give `data` a body and it renders the body once per row instead of a table, with `$row` bound to that row:

```markdoc
{% data src="team.csv" sort="name" %}
	{% card %}
	### {% $row.name %}

	{% $row.role %}
	{% /card %}
{% /data %}
```

`$row.<column>` uses the name after `columns` renames it. Numeric columns bind as numbers, the rest as text. Filtering, sorting and slicing run first, as for the table.

The rendered rows land where hand-written ones would, so runes that build from their children, such as `accordion`, `tabs` and `bento`, work with them:

```markdoc
{% accordion %}
	{% data src="faq.csv" %}
		{% accordion-item %}
		## {% $row.question %}

		{% $row.answer %}
		{% /accordion-item %}
	{% /data %}
{% /accordion %}
```

A `{% snippet %}`, `{% include %}` or nested `{% data %}` in the body can take its attributes from `$row`, as in `{% snippet path=$row.path /%}`.

Markdoc does not fill in variables inside backticks, so `` `{% $row.name %}` `` prints the tag itself on every row, with no warning. Use `{% code %}{% $row.name %}{% /code %}` for a code-styled value.

### A table with formatted cells

Set `headers` and the body becomes one table row, with `---` between cells:

```markdoc
{% data src="_data/rune-attributes.json" root="attributes" where="rune:card scope:own"
        headers="Attribute, Type, Required, Description" %}
{% code %}{% $row.name %}{% /code %}
---
{% $row.type %}
---
{% if $row.required %}✓{% else /%}—{% /if %}
---
{% $row.description %}
{% /data %}
```

Use it when cells need markup: the bodyless table shows cell text as-is, so it can print `true` but never `✓`. `chart` and `datatable` take this table the same way.

- The number of `headers` must match the number of cells, or the build fails.
- `headers` needs a body; on a self-closing tag it is an error.
- A `---` inside a cell's text splits it, as in [card](/runes/card) and [grid](/runes/grid).

### Nested queries

A `{% data %}` in another's body runs once per outer row:

```markdoc
{% data src="axes.json" where=$r %}
	## {% $row.axis %}

	{% data src="axis-attributes.json" where=$row.query headers="Attribute, Type" %}
	{% code %}{% $row.name %}{% /code %}
	---
	{% $row.type %}
	{% /data %}
{% /data %}
```

Inside the inner body, `$row` is the inner row. The outer row reaches the inner query only through its attributes, as in `where=$row.query`. Nothing builds strings here, so store the ready-made filter (`"axis:bg"`) in a column. An inner query that matches nothing renders nothing, and the outer row still renders.

### Limits

- `{% if %}` works (`{% else /%}` is self-closing); there is no loop inside a row.
- `$row` is not `$item`: a collection's `$item` is an entity with `data`, a row is flat, so `$item` here is an error.
- A body inside `chart` or `datatable` is an error; they need the table.
- `numeric` and `text` warn on a body, since there are no table cells to type; numeric columns still bind as numbers.

## When something goes wrong

A missing file, a file it cannot parse, a path outside the project, or a file or `root` with no rows shows an error in place of the table, and the build reports it. A `where` that matches nothing is not an error: the rune renders nothing, the way a list of open bugs is empty when there are none.

An attribute the rune cannot read is a build error. Attributes are read before functions run, so `where=concat(…)` fails, as do an undefined variable and an empty `where`; read as empty, they would show every row.

A column name that the file does not have is a warning that lists the ones it does:

```
data "revenue.csv": `where` names a column the source does not have: "regio". Available: region, quarter, revenue.
```

## Attributes

Every attribute in one table. Format-specific ones say so in their description — `CSV/TSV:` or `JSON:`; the rest apply to every source.

{% include file="rune-attributes.md" variables={r: "rune:data"} /%}

## See also

- [Chart](/runes/chart) — plots the emitted table.
- [Datatable](/runes/datatable) — search and sort over the emitted table in the browser.
- [Snippet](/runes/snippet) — embeds a project file as a code block.
- [Hosted & in-memory builds](/extend/plugin-authoring/hosted-builds) — how `src` is read when a build has no local filesystem.
