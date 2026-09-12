---
"@refrakt-md/runes": patch
---

`{% data %}`: a query can now nest inside another query's body (WORK-553)

A `{% data %}` inside another one's body runs as a subquery, once per outer row:

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

`$row` refers to the **nearest enclosing** query's row, so the inner table sees attribute rows even when both sources have a column of the same name. The outer row reaches exactly one place: the subquery's **attributes**, which is how it gets filtered — `where=$row.query`.

Two things were in the way, both now fixed:

- `bindRow` descended into a nested query's body and resolved its `$row` references against the *outer* row, blanking them to `''` when the outer row had no such column. A nested `data` now keeps its body untouched; only its attributes bind.
- `walkAndReplaceData` advanced past what it spliced, so inner tags survived to the transform and threw. The spliced output is now walked, which terminates without a depth limit because the tags come from the authored body and each pass consumes one level of it.

An empty subquery renders nothing and does not take its row with it — a row whose subquery finds no matches still renders its own content.

This is what lets a generated list carry a table per item: refrakt's own rune pages now render each universal axis as an accordion item containing that axis's attribute table.
