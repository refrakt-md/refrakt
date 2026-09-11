{% bug id="BUG-010" status="confirmed" severity="major" milestone="v0.33.0" tags="runes,data,dx" %}

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
- [ ] A `where` attribute that is present but resolves to empty is an error, not a silent pass-through
- [ ] The message names the attribute and says what was unresolvable
- [ ] `sort`, `columns` and the other optional shaping attributes behave the same way — present-but-unresolvable is not silently ignored
- [ ] Omitting an attribute entirely stays valid and unchanged
- [ ] A test covers present-but-unresolvable separately from absent, since the two produce identical values today

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

{% /bug %}
