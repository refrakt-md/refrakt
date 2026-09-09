{% spec id="SPEC-127" status="draft" tags="runes, data, authoring, dx" %}

# Per-row templates for the data rune

`{% data %}` reads a tabular or JSON source, shapes it, and emits a `<table>`.
The table is the only output shape it has. This spec proposes an optional
**body**, transformed once per row with `$row` bound — so a data file can drive
arbitrary Markdoc, not only table cells.

```markdoc
{% data src="tokens.json" root="color" orient="index" key-column="token" %}
### {% $row.token %}

{% swatch value=$row.value /%} — {% $row.description %}
{% /data %}
```

## Problem

Several pages in this repo want the same thing: *repeat this bit of Markdoc once
per row of a data file.* Today the options are to hand-maintain the repetition,
or to reshape the content until it fits a table.

`data` already does the hard parts — sandboxed reading, format inference, `root`
/ `orient` for JSON, `columns` select-order-rename, `where` filtering, `sort`,
`limit`, numeric typing. The only thing it cannot do is render a row as anything
other than a table row.

## The templating contract already exists

This is not a new concept for the project. Two mechanisms already bind a record
to a Markdoc body:

- **`{% collection %}`** — per-item templates with `$item` bound.
- **`entityRoutes`** — `render` / `render-template`, same contract, for
  generated pages.

Both are deliberately shallow: bind a record, render a block, no control flow.
That shallowness is the design, and this spec inherits it — see the constraint
below.

The difference is only in where the records come from. `collection` and
`entityRoutes` read the entity registry; `data` reads a file. Giving `data` a
body closes that gap without inventing a third vocabulary.

## Evidence from the SPEC-126 investigation

Testing whether `{% data %}` could render the `refrakt.config.json` schema
reference produced a useful calibration of where the ceiling actually is.

**It gets further than expected.** Against the real schema, with no new code:

```markdoc
{% data src="packages/transform/refrakt.config.schema.json"
        root="definitions.SiteConfig.properties"
        orient="index" key-column="Field"
        columns="Field, type as Type, description as Description" /%}
```

renders all 22 `SiteConfig` fields, no warnings. `orient=index` already handles
the object-of-objects shape a JSON Schema `properties` map has, and `where`
works on schema keywords — `where="deprecated:true"` correctly returned only
`target`.

**Where it stops is instructive.** `$ref` properties render blank:

```
["theme","","Active theme — accepts a package name string…"]
["highlight","",""]
["runes","",""]
```

`highlight` has no `type` and no `description` of its own; both live on
`HighlightConfig`. That is not a templating limitation — it is a *semantics*
limitation. Resolving `$ref`, folding a sibling `required` array into per-row
flags, collapsing `oneOf` into a readable type: all of that requires knowing what
JSON Schema means.

**The conclusion this spec takes from that:** a per-row template makes `data`
much more useful for sources that are *already rows*, and does nothing for
sources that need domain semantics decoded first. Those still want a generator
that understands the format and emits flattened rows — which `data` can then
render. The two compose; neither replaces the other.

## Constraint: stay shallow

The failure mode is obvious and worth naming up front. Add conditionals,
iteration, and per-cell formatting and this becomes a template language embedded
in Markdoc — Handlebars with different delimiters. `collection`'s templates avoid
that by binding one record and rendering one block, with formatting handled by
shared Markdoc functions rather than template syntax.

Hold that line: **bind `$row`, render the body, no control flow.** A page that
needs conditional structure per row wants a generator or a rune of its own.

## Open questions

- **`$row` or `$item`?** `$item` matches `collection` and `entityRoutes` exactly,
  which argues for consistency. `$row` is more honest about the source being
  tabular, and avoids implying registry semantics that are not there. Leaning
  `$row`, with `$item` possibly accepted as an alias.
- **What happens to `columns`, `numeric`, and `text` when a body is present?**
  `columns` still makes sense as select-and-rename (it determines which keys
  `$row` exposes and under what names). `numeric` / `text` exist to emit
  `data-value` for charts and sorting — arguably meaningless without a table,
  but harmless. Decide whether they warn or are silently ignored.
- **Does the body-form still compose inside `{% chart %}` / `{% datatable %}`?**
  Almost certainly not — those consume a `<table>`. The body form should
  probably be a build error inside them rather than a silently empty chart.
- **Nesting.** A row whose value is itself an array is the obvious next ask.
  Out of scope here; it is the first step toward the control flow this spec is
  trying not to build.

## Acceptance Criteria

- [ ] `{% data %}` accepts an optional body, transformed once per row with the row bound
- [ ] The binding contract matches `collection` per-item templates, including shared formatter functions
- [ ] Attributes that shape the rows (`root`, `orient`, `columns`, `where`, `sort`, `limit`, `offset`) apply identically with or without a body
- [ ] The body form composes with the existing sandbox and in-memory `ProjectFiles` seam
- [ ] Using the body form where a `<table>` is required (inside `chart` / `datatable`) is a clear build error, not an empty render
- [ ] Documented on `/runes/data` with a worked example, and cross-referenced from `collection`'s per-item templates

## References

- SPEC-126 — the config reference generator; the investigation that produced the evidence above, and the case where a per-row template is *not* sufficient on its own
- `/runes/collection` — the per-item template contract this inherits
- `/docs/configuration/entity-routes` — `render` / `render-template`, the same contract applied to generated pages

{% /spec %}
