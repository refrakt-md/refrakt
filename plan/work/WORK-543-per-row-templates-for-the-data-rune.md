{% work id="WORK-543" status="done" priority="high" complexity="moderate" source="SPEC-127" milestone="v0.33.0" tags="runes,data,authoring" %}

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
- [x] `{% data %}` accepts an optional body, transformed once per row with `$row` bound
- [x] Row outputs are **spliced** into the parent's children as direct siblings, not wrapped in a container node
- [x] A test proves the body form composes with a rune that reads its own children — generated `{% accordion-item %}` tags inside `{% accordion %}` is the case to pin
- [x] `$item` is **not** accepted as an alias
- [x] Shaping attributes (`root`, `orient`, `columns`, `where`, `sort`, `limit`, `offset`) apply identically with or without a body
- [x] Shared markdoc formatter functions work inside the body, as they do in `collection` templates
- [x] The body form composes with the existing sandbox and the in-memory `ProjectFiles` seam
- [x] Using the body form where a `<table>` is required (inside `chart` / `datatable`) is a clear build error, not an empty render
- [x] A decision is recorded for `numeric` / `text` with a body present — warn or silently ignore
- [x] `/runes/data` documents it with a worked example, cross-referenced from `collection`'s per-item templates

## Approach

**Splice the rows in; do not wrap them.** `preprocessData` currently does a 1:1
replacement (`node.children[i] = resolveDataToNode(...)`), so emitting *N* rows
forces this line to change. Wrapping them in one container to preserve the 1:1
shape is the tempting minimal edit, and its effect depends on which container: a
spike hand-authoring `{% accordion-item %}` at each depth found direct children
and a `{% div %}` wrapper both fine, while `{% section %}` and `{% grid %}`
wrappers destroyed the items **and their body text** with no error or warning.
See {% ref "SPEC-127" /%} for the table. Splicing costs one line and makes the
question moot for every parent rune.

Note the spike probed only the destination half — `{% data %}` has no body form
to test until this work item ships, so the end-to-end composition is an
acceptance criterion here, not an established fact.

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

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`packages/runes/src/data-pipeline.ts`** — `resolveData` returns `Node[]`, and
`walkAndReplaceData` splices rather than assigning. `bindRow` deep-clones the
body per row, substituting `Variable`s whose path starts with `row`; `rowObjects`
projects the typed table into plain objects keyed by column header. A
`TABLE_CONSUMERS` check makes a body inside `chart` / `datatable` a build error.

**`packages/runes/src/tags/data.ts`** — a note on why the content model stays
empty while a body must still be allowed: the body never reaches the transform,
but Markdoc rejects the tag before the preprocessor sees it otherwise.

**`packages/runes/test/data-row-template.test.ts`** — 9 tests, including the one
SPEC-127 could not write before: `{% accordion %}` building two items from
generated `{% accordion-item %}`s.

**Docs** — `/runes/data` gains the body form, the composition example, and the
limits; `/runes/collection` cross-references it and says why the binding name
differs.

### Notes

- `$row` binds at preprocess, not via `config.variables` — the binding differs
  per row and one shared config cannot express that. Variables reach the AST as
  `Variable` objects in a node's *attributes*, on tags and text nodes alike, so
  one rule covers both.
- Numeric columns bind as numbers so a template can compute with them; other
  columns bind as the cell's text, which is what a template renders.
- `numeric` / `text` **warn** with a body rather than being silently ignored —
  they type `data-value` on cells a body does not emit.
- One test expectation was wrong at first: `card` moves `href` onto the link
  element it wraps the surface in, not the card tag. The binding was correct.
- Full suite 4273 passing.

{% /work %}
