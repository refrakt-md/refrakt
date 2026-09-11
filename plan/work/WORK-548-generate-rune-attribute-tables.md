{% work id="WORK-548" status="in-progress" priority="high" complexity="complex" source="SPEC-128" milestone="v0.33.0" tags="docs,runes,reference,tooling" %}

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
- [ ] The script emits a byte-stable JSON artifact covering every rune in **every configured site**, not just the default one
- [ ] A test asserts that coverage — a generator reading one site emits a plausible artifact missing every plan rune, and a naive freshness check passes anyway
- [ ] Pages outside `/runes/` that document rune attributes are covered, including `plan/docs/plan-entities.md`
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] Pages carry their own and base-preset attributes rendered from the artifact
- [ ] Universal attributes render as a collapsed accordion with **one item per carried axis**, not one row per attribute
- [ ] Axes the rune does not carry are **not** items — they render as an uncollapsed note beneath, grouped by reason, one line each
- [ ] The accordion is authored once and included, not markup repeated across ~45 pages — needs {% ref "WORK-549" /%}, since a partial cannot contain `{% data %}`
- [ ] `SerializedRune` carries full attribute records for universals, grouped by axis — not the current bare `string[]`
- [ ] Per-axis prose comes from the facet contract descriptions in `packages/transform/src/facets/`
- [ ] The six runes with no universal attributes render no accordion at all — just their one-line posture reason
- [ ] The rendered universal section agrees with `refrakt reference <name>`
- [ ] Internal `__`-prefixed attributes are filtered **in `serializeRune`**, not in the generator — `__deferred-body` reaches `reference --format json` today on `aggregate`, `collection` and `relationships`
- [ ] `PAGELESS` carries each child rune's parent as data, not as a comment, so a child's attributes land on the parent's page
- [ ] `error` and `region` are distinguishable from child runes — "no table anywhere" is not the same answer as "documented on the parent's page"
- [ ] `check-rune-docs.mjs` gains a content check: the artifact is fresh, and no page hand-writes a table for a rune with generated rows
- [ ] The stale-artifact failure names the command to run
- [ ] Pages with more than one table keep their hand-written ones intact

## Approach

**Iterate sites, don't assume one.** The plan runes live in `@refrakt-md/plan`,
only in the `plan` site's plugin set. `refrakt reference work --format json`
reports "Unknown rune" without `--site plan`. The failure mode here is quiet:
the artifact would simply lack every plan rune, and the freshness test would
pass because it matches what the generator produced. The coverage assertion is
what catches it.

**Convert the corrected pages first** — the four from {% ref "BUG-006" /%}, then
`plan-entities.md` once {% ref "BUG-007" /%} has fixed it. Their tables will have
just been put right by hand, so the generated output can be diffed against a
known-good result. That proves the generator reproduces a reviewed answer,
rather than asking a reviewer to check a generated table against a schema by
eye.

**Own attributes in the table; universals in an axis accordion.** Of the
universal attributes, 24 are constant across all 45 runes that carry any — only
`prominence` (10/45), `reading`+`dropcap` (8/45) and `frame*` (4/45) vary, and
six runes carry none at all. So render the delta, at axis granularity, in a
collapsed accordion authored once as a shared block. Full argument and
measurements in {% ref "SPEC-128" /%} D1; the inclusion mechanism is
{% ref "WORK-549" /%}.

**Unavailable axes are a note, not items.** 28 runes have 4 unavailable axes
against 8 carried, and the 6 inline runes have 12 against 0 — as items that
reads as a section saying "no" twelve times. Grouped by reason it collapses:
no rune has more than three distinct reasons, and `badge`'s twelve axes share
one. The six zero-universal runes then need no special case — no carried axes
means no accordion, just the note. This is also exactly what
`refrakt reference <name>` prints, so the CLI-agreement criterion comes free.

This needs `SerializedRune` to stop discarding universal attribute definitions —
`attributes.universal` is a bare `string[]` today while `own` / `base` are full
records. Budget for that; it is a change to a stable JSON contract.

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

## The shared block needs an include rune

`{% data %}` cannot live inside a `{% partial %}` — `preprocessData` walks the
page AST before transform, while partials resolve *at* transform, so the tag
survives to its throwing transform. That blocks the shared-block criterion
above.

Filed as {% ref "SPEC-129" /%} (a pre-transform include rune) and
{% ref "WORK-549" /%}. Testing it also surfaced {% ref "BUG-010" /%}: a `where`
that cannot be resolved silently matches every row, so a page filtering one
rune's attributes would render the whole catalogue under that rune's heading and
look plausible.

## Blocked by

- {% ref "WORK-543" /%} — the pages need the `data` body to render rows
- {% ref "WORK-549" /%} — the shared accordion block cannot be a partial; it needs the include rune
- {% ref "BUG-009" /%} — the data source carries phantom runes (`music-playlist`) and omits nine child runes (`accordion-item`, `tab`, …); generating from it before that is fixed bakes both into the artifact

## Scope, now that WORK-547 has landed

**108 runes**, not the minority this item was drafted against. Every rune with
at least one own or base-preset attribute gets a table; the 10 with none get
nothing. 72 of those 108 have a page with no table today, 17 of them with a
*required* attribute. See {% ref "SPEC-128" /%} for the survey.

Child runes (16 with attributes) render onto their parent's page via D5's map.

{% /work %}
