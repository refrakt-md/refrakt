{% work id="WORK-548" status="ready" priority="high" complexity="complex" source="SPEC-128" milestone="v0.33.0" tags="docs,runes,reference,tooling" %}

# Generate rune attribute tables

Rune pages render their attribute tables from the reference data
`refrakt reference --format json` already produces, instead of hand-copying
schemas. Extends `scripts/check-rune-docs.mjs` from page *coverage* to page
*content*.

```
scripts/generate-rune-attributes.mjs
  read    the active rune set, via the same path check-rune-docs.mjs uses
  emit    site/content/_data/rune-attributes.json   ← committed, diffable
```

One artifact for all runes; each page selects its own rows with
`where="rune:snippet scope:own"`.

## Why this is cheaper than the config reference

`serializeRune` already emits the right shape — attributes split into `own` /
`base` / `universal`, each with type, required, and description, with
`HIDDEN_ATTRIBUTES` applied. Unlike JSON Schema, there is **no semantic decoding
left to do**: no `$ref` to resolve, no sibling `required` array to fold.

## Acceptance Criteria
- [ ] The script emits a byte-stable JSON artifact covering the active rune set
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] Pages carry their own and base-preset attributes rendered from the artifact
- [ ] Universal attributes are not listed per page; the page links to their reference
- [ ] Internal `__`-prefixed attributes are filtered — `__deferred-body` currently reaches `reference --format json` for every rune with a body
- [ ] `check-rune-docs.mjs` gains a content check: the artifact is fresh, and no page hand-writes a table for a rune with generated rows
- [ ] The stale-artifact failure names the command to run
- [ ] Pages with more than one table keep their hand-written ones intact

## Approach

**Convert the four {% ref "BUG-006" /%} pages first.** Their tables will have just
been corrected by hand, so the generated output can be diffed against a known-good
result — proving the generator reproduces a reviewed answer, rather than asking
a reviewer to check a generated table against a schema by eye.

**Own attributes only.** Every rune carries a dozen-plus universal axes (`tint`,
`bg`, `width`, `reading`, …); listing them per page buries the two or three the
reader came for. WORK-535 made a second option available — reporting the axes a
rune *lacks*, with the reason — which is genuinely useful but belongs in a
collapsed block, not the primary table.

**`aggregate.md` is the page to design against.** It has two tables: an `$item`
variables table and an attributes table. Only the second is generated, and the
first must survive untouched.

**Extend the existing guard, don't add a second script.** `check-rune-docs.mjs`
already answers "do the pages and the runes agree?" for one meaning of agree. A
separate script answering a second meaning splits a question that reads better
whole.

Filter internal attributes by the `__` prefix convention rather than growing
`HIDDEN_ATTRIBUTES` entry by entry — the prefix already means "internal", and a
list would need maintaining.

## Blocked by

- {% ref "WORK-547" /%} — the scope is unknown until the survey lands
- {% ref "WORK-543" /%} — the pages need the `data` body to render rows

{% /work %}
