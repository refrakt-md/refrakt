{% bug id="BUG-010" status="fixed" severity="major" milestone="v0.33.0" tags="runes,data,dx" %}

# An unresolvable `data` `where` value silently matches every row

`{% data %}` resolves `where` through `resolveString`, which handles string
literals and `Variable` nodes. Anything else — a `Function` node, most obviously
— returns the empty string, and `applyWhere` treats an empty expression as *no
filter*. So a `where` the rune cannot understand renders the **entire** source
instead of erroring.

```markdoc
{% data src="rune-attributes.json" root="attributes"
        where=concat("rune:", $page.slug, " scope:own") %}
```

Every row in the file renders. No warning, no build error.

## Expected

A `where` that cannot be resolved is a build error, or at minimum a warning. An
author who wrote a filter and gets an unfiltered result should be told.

## Actual

The unfiltered result looks plausible — which is what makes it dangerous. On a
page filtering one rune's attributes out of a catalogue, the failure renders
*every rune's* attributes under that rune's heading. It reads as a page that
works until someone counts the rows.

## How it was found

While testing whether {% ref "SPEC-129" /%}'s macro could derive a rune name from
the page rather than taking a parameter. The first check asked "did the expected
row render?" and passed — because an unfiltered result contains the expected row
along with every other. Only checking for a row that should have been *filtered
out* exposed it.

Same shape as the boolean-truthiness bug in {% ref "WORK-544" /%}, where a JSON
`false` arrived as the truthy string `"false"` and `{% if %}` rendered for every
row: a wrong answer that passes the obvious assertion.

## Steps to reproduce

```markdoc
{% data src="two-rows.json" root="rows" where=concat("a", "b") %}
{% $row.name %}
{% /data %}
```

Both rows render. `where="ab"` — the same value as a literal — correctly matches
neither.

## Root cause

Two independently reasonable decisions meeting badly:

- `resolveString` returns `''` for anything it does not recognise, which is the
  right default for an *optional* attribute like `sort` or `columns`.
- `applyWhere` treats an empty expression as "no filter", which is right when the
  author wrote no `where` at all.

Composed, "I could not read your filter" becomes "you wrote no filter".

## Acceptance Criteria
- [x] A `where` attribute that is present but resolves to empty is an error, not a silent pass-through
- [x] The message names the attribute and says what was unresolvable
- [x] `sort`, `columns` and the other optional shaping attributes behave the same way — present-but-unresolvable is not silently ignored
- [x] Omitting an attribute entirely stays valid and unchanged
- [x] A test covers present-but-unresolvable separately from absent, since the two produce identical values today

## Approach

Distinguish *absent* from *unresolvable* at the call site rather than inside
`resolveString`: the attribute's presence is knowable (`'where' in
tag.attributes`), and an attribute that is present but resolves to empty is the
error case.

Resist widening `resolveString` to evaluate functions as the *fix* — that is
{% ref "SPEC-129" /%}'s concern and would make this bug invisible again rather
than fixed. A `where` referencing an undefined variable would still resolve to
empty and still need to fail loudly.

## References

- {% ref "SPEC-129" /%} — the macro rune, whose page-derived query is what surfaced this
- {% ref "WORK-544" /%} — the same class of silent-success bug, one milestone earlier

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `packages/runes/src/data-pipeline.ts` — `resolveAttr` returns `{ ok, value } | { ok: false, why }` instead of collapsing every failure to `''`. `resolveString` is now a thin wrapper for the call sites that report separately.
- A `STRING_ATTRIBUTES` list checked up front: for each key **actually present** on the tag, an unreadable value is a build error naming the attribute and the reason. All failures are reported together.
- `site/content/runes/data.md` — a section on unreadable attributes under "When something goes wrong".
- `packages/runes/test/data-rune.test.ts` — 8 tests.

### Notes

**Re-measured before fixing, because BUG-011 had touched this code since the bug was filed.** Still live, and the numbers are stark — on a two-row source, the valid filter rendered 2 rows (header + match) while `concat(…)`, an undefined variable and an explicit `where=""` each rendered 3: the entire source, silently.

**Three failures, three messages.** The old resolver could not distinguish them and the new one does: a function call says `data` reads its attributes during preprocess, before functions are evaluated; an undefined variable is named; an explicitly empty value says so. The first is the one that surfaced this, and the message is the part that makes it actionable rather than mysterious.

**Presence, not emptiness, is the test.** `'where' in tag.attributes` separates absent from unreadable — which is the whole bug, since both produced `''` before. Probed both ways: disabling the check fails the 5 new tests; treating absent as present fails 6 existing ones across two files.

**BUG-011's posture is preserved and pinned by a test.** "I read your filter and it matched nothing" still renders nothing silently; only "I could not read your filter" errors. Those two were deliberately separated one item ago and it would be easy to re-merge them by accident.

**Resisted widening `resolveString` to evaluate functions**, as the approach warned. That would have made `concat(...)` work and left the bug invisible again — a `where` referencing an undefined variable would still resolve to empty and still need to fail loudly. Function evaluation at preprocess time is a separate question; this is about not lying when the answer is unavailable.

**Verified against the real site**, which is the case that matters: 94 rune pages pass `where=$r` through an `{% include %}`, and a page that forgot the binding used to render the entire 516-row catalogue under one rune's heading. Build is clean at 0 errors.

{% /bug %}
