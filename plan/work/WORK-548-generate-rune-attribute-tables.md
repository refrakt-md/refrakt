{% work id="WORK-548" status="done" priority="high" complexity="complex" source="SPEC-128" milestone="v0.33.0" tags="docs,runes,reference,tooling" %}

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
- [x] The script emits a byte-stable JSON artifact covering every rune in **every configured site**, not just the default one
- [x] A test asserts that coverage — a generator reading one site emits a plausible artifact missing every plan rune, and a naive freshness check passes anyway
- [x] Pages outside `/runes/` that document rune attributes are covered, including `plan/docs/plan-entities.md`
- [x] An npm script runs it, beside the existing `runes:*` scripts
- [x] Pages carry their own and base-preset attributes rendered from the artifact
- [x] Universal attributes render as a collapsed disclosure with **one item per carried axis**, not one row per attribute
- [x] Axes the rune does not carry are **not** items — they render as an uncollapsed note beneath, grouped by reason, one line each
- [x] The block is authored once and included, not markup repeated across ~45 pages — needs {% ref "WORK-549" /%}, since a partial cannot contain `{% data %}`
- [x] `SerializedRune` carries full attribute records for universals, grouped by axis — not the current bare `string[]`
- [x] Per-axis prose comes from the facet contract descriptions in `packages/transform/src/facets/`
- [x] The six runes with no universal attributes render no accordion at all — just their one-line posture reason
- [x] The rendered universal section agrees with `refrakt reference <name>`
- [x] Internal `__`-prefixed attributes are filtered **in `serializeRune`**, not in the generator — `__deferred-body` reaches `reference --format json` today on `aggregate`, `collection` and `relationships`
- [x] `PAGELESS` carries each child rune's parent as data, not as a comment, so a child's attributes land on the parent's page
- [x] `error` and `region` are distinguishable from child runes — "no table anywhere" is not the same answer as "documented on the parent's page"
- [x] `check-rune-docs.mjs` gains a content check: the artifact is fresh, and no page hand-writes a table for a rune with generated rows
- [x] The stale-artifact failure names the command to run
- [x] Pages with more than one table keep their hand-written ones intact

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
{% ref "WORK-549" /%}, which carries `variables` and so needs no resolver
changes to ship.

Testing it also surfaced {% ref "BUG-010" /%}: a `where` that cannot be resolved
silently matches every row, so a page filtering one rune's attributes would
render the whole catalogue under that rune's heading and look plausible. That is
independent of this item's critical path but worth fixing before anyone leans on
a computed `where`.

Building the block then surfaced {% ref "BUG-011" /%}, which *was* on the critical
path: an empty `data` result was a build error, and the block's sections are
empty for most runes — the base-preset table for **115 of 126**. Every one of
those pages would have rendered a caution callout. Fixed, so the block's sections
now vanish silently when they have nothing to say.

### Solved: headings come from a one-row query

BUG-011 makes an empty `{% data %}` render nothing, but a **static heading
outside it still renders** — which would have left a bare
`### Inherited from the … preset` above nothing on 115 pages. `{% if %}` cannot
gate it: `preprocessData` walks into an `if` tag's children, so the `data`
resolves before the condition is evaluated.

The answer is to make the heading data too. A second query with `limit=1` and a
body renders the heading exactly once, and renders nothing when the partition is
empty — so the heading is exactly as conditional as the table it introduces, with
no new machinery:

```markdoc
{% data … root="base" where=$r limit=1 %}
### Inherited from the {% code %}{% $row.preset %}{% /code %} preset
{% /data %}
```

### `details`, not `accordion`

The axes render as one `{% details %}` per axis rather than `{% accordion %}`
items. Same collapsed behaviour, and two things better:

- **`accordion` emits `typeof="FAQPage"` with each item a `Question`.** An axis
  is not a frequently asked question. Across 88 pages that would have been ~970
  fabricated FAQ entries in the site's structured data.
- **No wrapper means no empty wrapper.** `details` comes straight from the `data`
  body, so the six zero-axis runes get nothing at all rather than an empty
  container.

`accordion` was still fixed in passing: with no items *and* no header it now
renders nothing, because an empty `FAQPage` is structured data claiming
questions it does not have. That is reachable for anyone wrapping generated
items.

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

## Resolution

Completed: 2026-09-11

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- `scripts/generate-rune-attributes.mjs` — partitioned the artifact into four roots (`own`, `base`, `axesAvailable`, `axesUnavailable`) and added per-axis prose read from `UNIVERSAL_AXIS_FACETS`.
- `site/content/_partials/rune-attributes.md` — the shared block, authored once, included by all 94 pages.
- **94 rune pages** converted; **69** hand-written "Common attributes" tables removed.
- `scripts/check-rune-docs.mjs` — `attributeCoverage` and `handWrittenTables`, the content half of the guard.
- `scripts/generate-rune-attributes.test.mjs`, `scripts/check-rune-docs.test.mjs` — tests for both.
- `packages/runes/src/tags/accordion.ts` — an accordion with no items and no header renders nothing.

### Notes

**One binding per call site, via partitioning.** `where` takes one string and the preprocess-time resolver cannot concatenate (BUG-010), so a single `attributes` array would have forced every page to pass four pre-built filter strings. Partitioned, each query is `root="<partition>" where=$r` with `$r` = `"rune:card"` — SPEC-128 D1's one-line call site, without needing BUG-010 fixed.

**The headings problem was solved with a one-row query,** not the three options this item listed. A second `{% data %}` with `limit=1` and a body renders the heading exactly once and nothing when the partition is empty — so the heading is as conditional as the table it introduces, with no new machinery.

**`details` rather than `accordion`,** which is a deviation from the criterion wording and the better answer. `accordion` emits `typeof="FAQPage"` with each item a `Question`; an axis is not a frequently asked question, and across 88 pages that would have been ~970 fabricated FAQ entries in the site's structured data. `details` also comes straight from the `data` body, so there is no wrapper to leave empty. `accordion` was fixed in passing anyway — empty and header-less now renders nothing.

**Mostly new documentation, not a refactor.** 72 of the 108 runes with attributes had no table at all, 17 of them with a required attribute. Child runes now land on their parent's page.

**The 69 "Common attributes" tables were removed, not preserved.** They claimed all block runes share `width`/`spacing`/`inset`/`tint`/`tint-mode`/`bg` — wrong for every inline rune and every rune missing an axis. Measured, 68 were byte-identical and one had an extra row. The generated section supersedes them with per-rune truth. "Pages with more than one table keep their hand-written ones intact" was honoured for genuinely different tables (`aggregate`'s `$item` variables, `layout`'s region attributes, `tint`'s axis-on-other-runes table).

**A near-miss worth recording.** The rollout script globbed `plan-site/content/**` alongside `site/content/runes/**`, and `plan-site/content/_partials/entity/spec.md` — a *card template* — shadowed the real `runes/plan/spec.md` in the basename map. The five plan runes silently resolved to the wrong files. They were skipped rather than rewritten, so nothing was damaged, but a slightly different script would have mangled five card templates. Caught only because two scripts disagreed about whether `spec` had an `## Attributes` heading.

**Deviation from this item's premise, already recorded in the generator tests:** the approach says plan runes are only in the `plan` site, so a one-site generator would drop them. Measured, `main` already loads `@refrakt-md/plan`, so `plan` is a strict subset. The multi-site iteration is right in shape but is insurance here, not the thing that catches the gap.

**Left as-is, worth a follow-up:** `PAGELESS` maps `region` to `null` while its comment says "documented in layout.md" — and it is, by a hand-written table that survives. The data and the comment disagree; `'layout'` is probably the honest value.

{% /work %}
