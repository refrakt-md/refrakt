---
"@refrakt-md/runes": patch
---

`{% data %}`: a body can now emit a table **row** (WORK-550)

Set `headers` and the per-row body becomes one table row — cells separated by `---` — instead of a run of blocks:

```markdoc
{% data src="attributes.json" root="attributes" where="rune:card scope:own"
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

This is how you get a generated table whose cells carry markup. The bodyless form builds its cells from literal text — right for arbitrary CSV, where a stray `*` should stay a `*` — so it can render `true` but never `✓`, and `href` but never `` `href` ``. Here the cells are markdown you wrote, so emphasis, links, runes and `{% if %}` all work inside one.

`---` is already refrakt's delimiter for this shape (`card` splits media / body / footer on it, `grid` splits columns), and Markdoc parses it to a clean `hr` with or without surrounding blank lines.

The emitted table is structurally identical to the bodyless one — a single-block cell is unwrapped so `<td>href</td>` matches a pipe table rather than `<td><p>href</p></td>` — so `chart` and `datatable` consume it unchanged.

Three errors worth knowing:

- A `headers` count that disagrees with the body's `---` cell count is a build error naming both numbers.
- `headers` on a self-closing `data` is an error rather than a silent no-op — it would read as a rename of `columns`, which selects and renames *source* columns instead.
- A `---` inside a cell's own content splits it, the same constraint `card` and `grid` carry.

A body without `headers` keeps emitting blocks exactly as before.
