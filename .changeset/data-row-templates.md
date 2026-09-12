---
"@refrakt-md/runes": minor
---

Give `{% data %}` an optional per-row body (SPEC-127)

Without a body `data` emits a `<table>`, as before. With one, the body is rendered **once per row** with `$row` bound to that row, so a data file can drive arbitrary Markdoc rather than only table cells.

```markdoc
{% data src="team.csv" sort="name" %}
{% card %}
### {% $row.name %}
{% $row.role %}
{% /card %}
{% /data %}
```

Rows are **spliced in as siblings**, landing where hand-written ones would, so the body form composes with runes that build structure from their own children — `{% accordion %}` with generated `{% accordion-item %}`s works.

`$row.<column>` reads a cell by column name, after `columns` renaming. Numeric columns bind as numbers; everything else as the cell's text. All shaping attributes (`where`, `sort`, `columns`, `limit`, `offset`, and the JSON `root`/`orient`) apply first, unchanged.

The binding is deliberately shallow — bind a row, render a block, no control flow. `$item` is not an alias for `$row`: a collection's `$item` is an entity, a data row is flat. A body inside `chart` or `datatable` is a build error rather than an empty render, since those consume the table. `numeric` / `text` warn when set alongside a body, as they type an attribute on table cells that a body does not emit.
