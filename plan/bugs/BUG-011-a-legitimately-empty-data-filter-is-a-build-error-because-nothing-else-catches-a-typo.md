{% bug id="BUG-011" status="fixed" severity="major" milestone="v0.33.0" tags="runes,data,dx" %}

# A legitimately empty `data` filter is a build error, because nothing else catches a typo

`{% data %}` throws `result is empty after projection (no rows to render)` whenever
the projection chain ends with zero rows. That fires on a filter which is
*correct* and simply has no matches — a normal thing to ask of real data.

The check cannot be relaxed on its own, because it is the only thing standing
between an author and a silently wrong page. Measured against a two-row source
with headers `name,scope`:

| `where` | What the author meant | Today |
|---|---|---|
| `scope:own` | valid, matches | renders |
| `scope:nope` | valid field, legitimately no matches | **error** |
| `scop:own` | **typo'd field name** | **error** |
| `garbage` | malformed clause | warned, then ignored |

Rows 2 and 3 are indistinguishable to the engine, and only row 3 is a mistake.
`applyWhere` has no warning of its own for a clause naming a field absent from
the data — so the empty-result error is doing double duty as the typo detector,
and pays for it by failing the legitimate case.

## Expected

Each condition gets its own signal:

- A clause naming a field the data does not have is a **warning**, whether or
  not the result is empty.
- A **source** that yielded zero rows before any projection — a bad `root`, a
  JSON pointer into nothing, an empty file — stays an **error**. The author
  pointed at the wrong thing.
- A filter that legitimately matched nothing renders **nothing**, with no
  diagnostic.

## Actual

One heuristic stands in for three conditions, so it is wrong about two of them.

## Steps to reproduce

Given `d.csv`:

```
name,scope
href,own
valign,base
```

```markdoc
{% data src="d.csv" where="scope:nope" /%}
```

The filter is well-formed and names a real column; there simply is no row with
that value. The build reports:

```
data "d.csv": result is empty after projection (no rows to render)
```

and the page renders a caution callout. Swapping the filter for `where="scop:own"`
— a misspelt column, and a genuine mistake — produces the identical message.

## How it was found

Building {% ref "SPEC-128" /%}'s shared universal-attribute block, which
{% ref "WORK-549" /%} made possible. The block is included by 126 rune pages and
several of its sections are empty for some of them — the base-preset table for
**115 of 126** runes, the axis accordion for 6, the unavailable-axes note for 5.
Every one of those pages would render a caution callout reading "result is empty
after projection".

Gating the sections with `{% if %}` does not work and is worth recording:
`preprocessData` walks into an `if` tag's children like any other node, so the
`data` resolves — and errors — before the condition is ever evaluated. A
preprocessor cannot see a transform-time conditional.

## Relationship to {% ref "BUG-010" /%}

The same `where` grammar failing quietly, in the opposite direction. BUG-010 is
an *unresolvable* `where` that matches **every** row; this is a *resolvable* one
that matches **no** rows and is treated as a failure. Both produce a plausible
page that is wrong, and both are fixed by making the `where` path say what it
actually did. Worth doing together.

## Acceptance Criteria
- [x] A `where` clause naming a field absent from the data emits a warning that names the field and lists the available ones
- [x] That warning fires whether or not the result is empty — a typo that happens to match is still a typo
- [x] A source that yields zero rows *before* projection remains a build error
- [x] A projection that legitimately filters every row away renders nothing, with no error and no warning
- [x] `sort` and `columns` naming an absent field warn on the same footing as `where`
- [x] A test covers the legitimately-empty filter separately from the typo, since the two produce identical output today
- [x] The shared block from {% ref "WORK-548" /%} renders on a rune with no base preset without a callout

## Approach

Move the detection to where the knowledge is. The projection functions already
have both the clause and the headers; comparing them is local, and neither
`applyWhere` nor `applySort` has to know anything about emptiness to do it.

Keep the pre-projection error. "The file parsed to zero rows" and "my filter
excluded everything" are different author mistakes and should not share a
message — collapsing them is what produced this bug.

Resist making the empty case a warning as a compromise. A page that filters for
open bugs and finds none is not something to warn about, and a warning that
fires on 115 of 126 pages trains everyone to ignore the channel.

## References

- {% ref "BUG-010" /%} — the same grammar failing quietly in the other direction
- {% ref "WORK-548" /%} — the shared block this blocks
- {% ref "SPEC-127" /%} — the per-row body, where the empty check was last touched

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/data-projection.ts` — new `unknownFieldWarnings(table, {where, sort, columns})`. Reuses `parseFieldMatch` and `parseColumnsSpec`, compares each clause's field against the adapter's headers, and returns a warning naming the column and listing the available ones. All three specs are checked against the *source* headers, which is right for each: `where` and `sort` run before `columns`, and `columns` names source headers even when it renames them.
- `packages/runes/src/data-pipeline.ts` — split the one blanket check into three:
  - zero rows *before* projection → error, with its own message about `root` / `orient`
  - a misspelt column → the new warning, emitted before projection so it fires regardless of the outcome
  - zero rows *after* projection → return `[]`, splicing the tag away silently
- `site/content/runes/data.md` — rewrote "When something goes wrong" to describe the three cases separately, with the warning's real text.
- `packages/runes/test/data-rune.test.ts` — replaced the single `errors visibly when the result is empty` test with five covering each condition.

### Notes

**The premise of the original error was sound; its resolution was not.** It existed because nothing else caught a misspelt column — measured, `applyWhere` warns on a *malformed* clause (`garbage`) but is silent on a well-formed one naming a column that does not exist. So it was standing in for a typo detector and failing the legitimate case as the price. Relaxing it without adding the detector would have traded this bug for a silent one, which is the BUG-010 family.

**Both halves were probed, not assumed.** Disabling the field check failed the three warning tests by name; restoring the old throw failed the two empty-result tests. Neither would have been visible from a green suite alone.

**Verified on the real case.** A shared `_partials/` block with an own-attributes table and a base-preset table, included for `accordion` (no base preset) and `card` (has one), builds with 3 tables and 0 error callouts. Before this, `accordion` rendered a caution callout reading "result is empty after projection" — and would have on 115 of the 126 rune pages.

**One thing this does not solve, surfaced by that smoke test.** A static heading *outside* a `{% data %}` still renders when the data is empty, leaving a bare `### Inherited` above nothing. That is shared-block design for WORK-548, not a `data` defect, and is noted there.

**Deliberately not done:** no `empty="skip"` attribute. It was the first option considered and is the wrong shape — it makes every author who hits the common case learn an attribute to say "empty is fine", while leaving the default wrong and the typo undetected.

{% /bug %}
