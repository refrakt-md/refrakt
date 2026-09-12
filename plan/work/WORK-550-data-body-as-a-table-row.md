{% work id="WORK-550" status="done" priority="high" complexity="moderate" source="SPEC-127" milestone="v0.33.0" tags="runes,data,authoring" %}

# `data` body as a table row

Extend {% ref "SPEC-127" /%}'s per-row body so a body can emit a **table row**
rather than a run of blocks — cells delimited by `---`, headers named by a new
attribute.

```markdoc
{% data src="…" root="attributes" where=$own
        headers="Attribute, Type, Required, Description" %}
{% $row.name %}
---
{% $row.type %}
---
{% if $row.required %}✓{% else /%}—{% /if %}
---
{% $row.description %}
{% /data %}
```

## The gap this closes

`data` has two output shapes today and neither gives a formatted table:

- **Bodyless** emits a `table` node whose cells `emitTableNode` builds from
  literal strings. No inline markup reaches them at all — `<td>href</td>`, never
  `<td><code>href</code></td>`, and `required` reads `true`, never `✓`.
- **With a body** the cells *would* be authored markdown, where formatting works
  — but the body repeats per row as blocks, so there is no grid.

So a generated reference table is strictly plainer than the hand-written one it
replaces. That is the blocker for {% ref "WORK-548" /%}, which regenerates ~94
of the most-read pages in the docs.

## Why the `---` delimiter, and not cell parsing

The obvious alternative was to make `emitTableNode` parse each cell as inline
Markdoc. It works, but it changes how **every existing** `data` table renders:
any source whose text contains `*`, `_`, `[` or a backtick starts rendering as
markup, with no way to say "I meant that literally". Avoiding that needs an
opt-in attribute naming the markdown columns — more surface, for a worse result.

The body route changes nothing that exists. Cells are authored markdown because
they always were; the only new thing is what the body *means* when `headers` is
present.

`---` is also already refrakt's delimiter for this shape — `card` splits its body
into media / body / footer on it, `grid` splits columns on it. Measured, Markdoc
parses it to a clean `hr` whether or not blank lines surround it, and with prose
or a variable on the preceding line, so there is no setext-heading ambiguity to
trip over.

## Acceptance Criteria
- [x] With `headers` set, the body is read as `---`-delimited cells and the rune emits one `tr` per row inside a full `table`
- [x] The header row comes from `headers`, and its cell count is checked against the body's — a mismatch is a build error naming both counts
- [x] Cells are authored markdown, so emphasis, links, runes and `{% if %}` all work inside one
- [x] `{% if $row.required %}✓{% else /%}—{% /if %}` renders the glyph, not `true` / `false`
- [x] Without `headers`, a body keeps emitting blocks exactly as it does today — a test pins that
- [x] `headers` on a **bodyless** `data` is an error, not silently ignored: it would read as a rename of `columns`
- [x] An empty result emits nothing at all, not a bare header row ({% ref "BUG-011" /%}'s posture)
- [x] The emitted table is structurally identical to the bodyless one, so `chart` / `datatable` consume it unchanged
- [x] A `---` inside a cell's own content is documented as splitting it, with the same caveat `card` and `grid` carry

## Approach

**One switch, stated once.** `headers`'s presence is what changes the body's
meaning. That is a mode keyed on an attribute, which is worth being explicit
about in the docs rather than leaving a reader to infer it from an example.

**Reuse `emitTableNode`'s output shape.** The point is that a body-built table is
the *same* `table` node the bodyless form emits, so everything downstream —
`chart`'s `findTable`, `datatable`'s lookup, the `td` node's `data-value`
channel — keeps working with no special case. Build `tr`/`td` around the bound
body children rather than inventing a parallel structure.

**The cell-count check is the error worth designing for.** Getting the delimiter
count wrong is the mistake an author will actually make, and a table with a
ragged row is the kind of wrong that looks plausible. Name both counts.

**Does not solve code spans.** `` `{% $row.name %}` `` inside a cell is still
literal — cells are authored markdown, and a code span is opaque by definition.
{% ref "WORK-551" /%} is what makes an attribute name render as `` `href` ``.

## References

- {% ref "SPEC-127" /%} — the per-row body this extends
- {% ref "WORK-548" /%} — the attribute tables that need it
- {% ref "WORK-551" /%} — the `code` rune, for the one construct this leaves open
- {% ref "BUG-011" /%} — the empty-result posture the header row has to respect

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/data-emit.ts` — `emitBodyTableNode(headers, rows)`, building the same `table > thead/tbody > tr > th/td` shape `emitTableNode` produces, but with cells made of already-parsed body nodes. Plus `unwrapCell`, which drops the wrapping `paragraph` from a single-block cell.
- `packages/runes/src/data-pipeline.ts` — `splitCells` (split a body on `hr`), the `headers` branch in `resolveDataToNodes`, the cell-count check, and the bodyless-`headers` guard.
- `packages/runes/src/tags/data.ts` — the `headers` attribute.
- `site/content/runes/data.md` — a new "A table with formatted cells" section, the attribute row, and two corrections to existing prose (below).
- `packages/runes/test/data-body-table.test.ts` — 9 tests for this item.

### Notes

**Two bugs the first cut had, both caught by tests rather than review.**

`if (headers)` is truthy for an empty array, so the table-row branch fired for *every* bodied `data` — breaking the existing block behaviour outright. The "leaves a body without `headers` emitting blocks, exactly as before" regression test is what surfaced it, which is exactly why it was written.

Cells rendered as `<td><p>href</p></td>` where a pipe table gives `<td>href</td>`, because a one-line cell parses to a paragraph. The structural-parity test missed it at first — it compared tag-name counts but `p` was not in the list. Adding `p` to that list made it fail, then `unwrapCell` fixed it. A cell with several blocks keeps them; there the wrapper is real structure.

**`{% else %}` is not self-closing in Markdoc — it is `{% else /%}`.** The first version of this work item, and my first test, both had it wrong. The wrong spelling does not error: Markdoc parses it as an opening tag, the nesting goes sideways, and `{% /data %}` ends up swallowed *inside* the `if` — so the `data` tag survives preprocess and dies at its own transform with a message about preprocess hooks not being wired. A confusing failure a long way from its cause. The work item text has been corrected.

**Two stale claims in `data.md` fixed in passing.** It said the per-row binding supports "no conditionals or iteration" — measured, `{% if %}` has worked in a plain body since the boolean coercion landed in WORK-544; only iteration is absent. And the backtick-trap section advised "use `**bold**`, or leave the value bare", which was the best answer available before {% ref "WORK-551" /%}.

**Verified in a real site build**, not only in tests: an `{% include %}`d partial containing a `headers` body with `{% code %}` and `{% if %}` renders `card`'s four own attributes as a table with `<code>` cells and `—` glyphs, 0 errors.

{% /work %}
