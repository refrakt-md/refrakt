{% work id="WORK-264" status="done" priority="medium" complexity="moderate" source="SPEC-070" tags="runes, collection, table" milestone="v0.16.0" %}

# Collection heading-delimited table columns

The rich-table path: a `table` collection's body uses the `sections` content model (heading = column separator + label, body = per-cell markdoc template with `$item`), with collection owning the `<table>`/`<thead>` and row alignment.

## Acceptance Criteria
- [ ] In `table` layout the body parses as heading-delimited sections; each heading is a column (label = heading text, ordered by sequence)
- [ ] Each column cell is the section's markdoc template, transformed per entity with `$item` bound (reusing WORK-262 capture)
- [ ] An empty body falls back to the `fields` shorthand; column heading text is static — `$item` in a heading warns
- [ ] collection emits `<table>`/`<thead>` and aligned rows; tests cover multi-column tables and formatting/combining in cells (with WORK-265 functions)

## Dependencies
- WORK-263 (collection core)
- WORK-262 (deferred-body capture)

## References

- {% ref "SPEC-070" /%} — Built-in layouts (heading-delimited columns)

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- Extended `collection-resolve.ts`: `splitColumns(bodySource)` parses the captured body into `{label, cellSource}` per heading (label = heading text, cell = `Markdoc.format` of the section's nodes); `renderHeadingTable` emits `<thead>` from labels and one `<tr>` per entity with each `<td>` = `transformDeferredTemplate(cellSource, embedConfig, {item})`.
- Render branch: `layout="table"` + body → heading columns; `layout="table"` + no body → `fields` projection; body + box layout → per-item template; else cards/list.
- `$item` in a column heading emits a build warning (headings are static labels).
- Test: added a heading-delimited-columns case to `packages/runes/test/collection.test.ts` (6 total green) — two heading-derived columns, one row per filtered entity, per-cell `$item` values.

### Notes
- Reuses the WORK-262 deferBody capture wholesale (the body is captured once; the resolver re-splits it per column).

{% /work %}
