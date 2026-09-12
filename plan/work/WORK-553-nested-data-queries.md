{% work id="WORK-553" status="done" priority="high" complexity="moderate" source="SPEC-127" milestone="v0.33.0" tags="runes,data,authoring" %}

# Nested `data` queries

A `{% data %}` inside another one's body should resolve, with `$row` bound to the
**nearest enclosing** query — a correlated subquery, parameterised by the outer
row.

```markdoc
{% data src="axes.json" where=$r %}
## {% $row.axis %}

{% data src="axis-attributes.json" where=$row.axis headers="Attribute, Type" %}
{% code %}{% $row.name %}{% /code %}
---
{% $row.type %}
{% /data %}
{% /data %}
```

## Why this is needed

{% ref "WORK-548" /%} renders each rune's universal axes as accordion items. The
item **content** wants to be an attribute table, but `data` generates the items —
so the table has to come from a query *inside* a query. There is no way to
restructure around it: which axes a rune carries is not known when the shared
block is authored.

## Two independent failures, both measured

**The inner body is blanked by the outer bind.** `bindRow` descends into every
child, so a nested `data`'s body has its `$row` references resolved against the
*outer* row. `{% $row.name %}` inside the subquery becomes `''`, because the
outer row has no `name` column:

```
where = "bg"    | body text = [""]
where = "tint"  | body text = [""]
```

Note the `where` values are correct — binding a subquery's *attributes* from the
outer row already works, and is exactly how it should be parameterised. It is
only the body that must not be touched.

**The spliced output is never re-walked.** `walkAndReplaceData` advances past
what it splices (`i += replacement.length - 1`), so inner tags survive to the
transform and throw. Measured: two unresolved `data` tags left in the AST.

## Acceptance Criteria
- [x] A `{% data %}` inside another's body resolves
- [x] `$row` in a subquery's **body** refers to the subquery's row, not the outer one
- [x] `$row` in a subquery's **attributes** still binds from the outer row — that is how it is parameterised
- [x] A test proves both halves at once: an outer column and an inner column of the same name resolve differently
- [x] Nesting is bounded, and the bound is the authored depth rather than an arbitrary limit
- [x] An empty subquery renders nothing, per {% ref "BUG-011" /%} — a row whose subquery finds nothing still renders its own content
- [x] `headers` works in a subquery, so an item's content can be a table
- [x] {% ref "WORK-548" /%}'s universal section renders a table per axis

## Approach

**Scope by stopping the descent.** In `bindRow`, a nested `data` tag gets its
attributes bound and its children copied verbatim. That single rule gives the
right semantics for both halves, and reads as ordinary lexical scoping: the
nearest enclosing query owns `$row`.

**Re-walk what was spliced.** The recursion terminates without an explicit depth
limit, because the tags come from the authored body and each pass consumes one
level of it. A row value cannot synthesise a new `data` tag — rows are text, and
`bindRow` only substitutes into slots that already exist. Worth asserting in a
test rather than relying on the argument.

**The artifact needs an axis-keyed partition, and it is small.** Measured across
the full rune set: every axis's attribute records are **identical on every rune**
— 0 of 12 vary. So the table data keys by axis alone, at **37 rows**, not by
(rune, axis) at 3105. {% ref "SPEC-128" /%}'s original objection to carrying
per-attribute universal data — "3081 rows against 515" — does not apply once the
duplication is factored out.

That also means the subquery does not need the rune at all: `where=$row.axis` is
the whole filter.

## References

- {% ref "WORK-548" /%} — the attribute tables that need this
- {% ref "SPEC-127" /%} — the per-row body this extends
- {% ref "WORK-550" /%} — `headers`, which the subquery uses to emit its table
- {% ref "BUG-011" /%} — the empty-result posture a subquery has to respect

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/data-pipeline.ts` — two changes:
  - `bindRow` no longer descends into a nested `data` tag's body. Its attributes still bind from the outer row (that is how a subquery is filtered); its children are deep-copied verbatim via a new `cloneNode`.
  - `walkAndReplaceData` walks the spliced replacement before splicing it, through a throwaway `document` container.
- `scripts/generate-rune-attributes.mjs` — new `axisAttributes` partition, plus `query` and `count` on each `axesAvailable` row.
- `site/content/_partials/rune-attributes.md` — each accordion item now contains that axis's attribute table.
- `site/content/runes/data.md` — a "Nested queries" section.
- `packages/runes/test/data-body-table.test.ts` — 6 tests.

### Notes

**The container is not incidental.** `walkAndReplaceData` only ever replaces *children*, so handing it a replacement node that is itself a `data` tag walks straight past the tag needing resolution — and a subquery as a direct child of the body is the common shape. The throwaway `document` wrapper is what makes that case work; the same pattern `include` uses for nested includes.

**Filter values must arrive ready-made.** `where=$row.axis` yields a bare `"bg"`, which the field-match grammar warns about and ignores — `where` needs `axis:bg`, and nothing at preprocess time concatenates (BUG-010). So the generator emits a `query` column holding `"axis:bg"`. Same trick as the page-level `$r` = `"rune:card"`; it is now the established pattern for parameterising a query from data.

**The artifact barely grew, because the duplication was measurable.** Every axis's attribute records are byte-identical on every rune that carries it — 0 of 12 vary, checked across the full set. So `axisAttributes` keys by axis alone at **37 rows**, not (rune, axis) at 3105. SPEC-128's objection to per-attribute universal data ("3081 rows against 515") only held while that duplication was assumed.

**Both halves were probed.** Removing the scoping stop failed 3 tests by name; removing the re-walk failed 6. Neither would have shown up in a green suite.

**Verified on the real pages.** `card` renders 11 accordion items, one per axis it carries, each containing a correctly filtered table — `bg` 11 rows, `frame` 10, `substrate` 5, `motion` 2, singles 1 — with 0 error callouts.

**Known, left alone:** the axis *description* is still duplicated across all 1068 `axesAvailable` rows (~25% of the 459KB artifact). It is rune-invariant like the attribute records were, so it could move to an axis-keyed partition — but reading it back would need a second subquery per item for little gain. Worth revisiting only if the artifact size becomes a problem.

{% /work %}
