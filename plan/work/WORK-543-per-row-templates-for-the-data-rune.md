{% work id="WORK-543" status="ready" priority="high" complexity="moderate" source="SPEC-127" milestone="v0.33.0" tags="runes,data,authoring" %}

# Per-row templates for the data rune

Give `{% data %}` an optional body, transformed once per row with **`$row`**
bound, so a data file can drive arbitrary Markdoc rather than only table cells.

```markdoc
{% data src="tokens.json" root="color" orient="index" key-column="token" %}
### {% $row.token %}

{% swatch value=$row.value /%} — {% $row.description %}
{% /data %}
```

`data` already does the hard parts — sandboxed reading, format inference,
`root` / `orient` for JSON, `columns`, `where`, `sort`, `limit`, numeric typing.
The only thing it cannot do is render a row as anything but a table row.

This is the rendering half of the milestone: {% ref "WORK-544" /%} and
{% ref "WORK-548" /%} both depend on it.

## Acceptance Criteria
- [ ] `{% data %}` accepts an optional body, transformed once per row with `$row` bound
- [ ] `$item` is **not** accepted as an alias
- [ ] Shaping attributes (`root`, `orient`, `columns`, `where`, `sort`, `limit`, `offset`) apply identically with or without a body
- [ ] Shared markdoc formatter functions work inside the body, as they do in `collection` templates
- [ ] The body form composes with the existing sandbox and the in-memory `ProjectFiles` seam
- [ ] Using the body form where a `<table>` is required (inside `chart` / `datatable`) is a clear build error, not an empty render
- [ ] A decision is recorded for `numeric` / `text` with a body present — warn or silently ignore
- [ ] `/runes/data` documents it with a worked example, cross-referenced from `collection`'s per-item templates

## Approach

**Stay shallow.** Bind `$row`, render the body, no control flow. Formatting goes
through the shared markdoc functions, not template syntax. Add conditionals and
iteration and this becomes Handlebars with different delimiters — `collection`'s
templates avoid that deliberately and this inherits the constraint.

**`$row`, not `$item`, and no alias.** The shapes differ: a collection `$item` is
an entity (`id` / `type` / `url` / `data`), a data row is flat. One name for two
shapes is a trap, and an alias would make the wrong mental model work just often
enough to be believed. See {% ref "SPEC-127" /%} for the full argument.

`columns` keeps meaning select-and-rename with a body present — it determines
which keys `$row` exposes and under what names. `numeric` / `text` exist to emit
`data-value` for charts and sorting, so they are arguably meaningless without a
table; decide whether they warn or are ignored, and say so in the docs either
way.

Nesting — a row whose value is itself an array — is explicitly out of scope. It
is the first step toward the control flow this is trying not to build.

{% /work %}
