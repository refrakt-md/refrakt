{% spec id="SPEC-128" status="draft" tags="docs, runes, reference, tooling, dx" %}

# Generate rune attribute tables from the rune reference

Rune reference pages carry hand-written `## Attributes` tables copied from rune
schemas. {% ref "BUG-006" /%} found four of thirteen already disagreeing with the
code, including an attribute documented with a worked example that has never
existed. This spec removes the copy: the tables render from the reference data
`refrakt reference --format json` already produces.

Same shape as {% ref "SPEC-126" /%} — data generated, prose written, rendered in
the page with `{% data %}` — applied to a much larger surface.

## Why this is a better candidate than the config reference

**The semantic work is already done.** SPEC-126 needs a script because JSON
Schema has to be decoded — `$ref` resolved, `required` folded, `oneOf`
collapsed. Here `serializeRune` already emits exactly the right shape:

```
refrakt reference snippet --format json
→ attributes: { own: {…}, base: {…}, universal: […] }
     each with type, required, description
```

It splits own / base-preset / universal, applies `HIDDEN_ATTRIBUTES`, and since
WORK-535 also reports which universal axes a rune *lacks* and why. There is no
decoding left to do.

**The guard has an obvious home.** `scripts/check-rune-docs.mjs` already exists
and already runs in `npm test` via a colocated live-parity test. It covers page
*existence*; this extends the same script to page *content*.

**The leverage is far higher.** Two pages in SPEC-126, versus a rune catalogue
that is the product's front door.

## Problem

Measured on `main` at `f92d50a`: of the 13 rune pages with an attribute table
where the page name resolves to a rune, **4 disagree with the schema** — see
{% ref "BUG-006" /%} for the specifics. One documents an attribute that was never
implemented; one omits a rune's only *required* attribute.

That is the recurrence rate for tables that are hand-copied from a moving
target, with no guard. Fixing the four is BUG-006's job. Stopping the fifth is
this spec's.

## Scope: pages that document rune attributes, not pages under `/runes/`

The obvious scope is the rune reference catalogue. It is too narrow.

{% ref "BUG-007" /%} found all five plan entity tables in
`site/content/plan/docs/plan-entities.md` drifted — it documents `{% spec %}`,
`{% work %}`, `{% bug %}`, `{% decision %}` and `{% milestone %}` attributes from
a plan docs page, outside `/runes/` entirely. A generator scoped to the rune
catalogue walks straight past it, and so does `check-rune-docs.mjs`, which is
why the drift there went unnoticed while the `/runes/` pages at least had a
coverage guard.

So the rule is **any page documenting a rune's attributes**, wherever it lives.

That has a concrete implementation consequence. The plan runes come from
`@refrakt-md/plan`, which is only in the `plan` site's plugin set:

```bash
refrakt reference work --format json              # → Unknown rune "work"
refrakt reference work --format json --site plan  # → works
```

A generator reading "the active rune set" from one site would silently emit an
artifact missing every plan rune — and the freshness test would pass, because
the artifact would match what the generator produced. **Iterate the configured
sites, and assert the artifact covers every rune in every site**, or the guard
guards nothing for a third of the catalogue.

## The prior question: why do 102 pages have no table at all?

Only 13 of ~115 rune pages carry an `## Attributes` section. **This has to be
answered before the scope is knowable**, and it is the main reason this is a
spec rather than a work item.

Two possibilities, with different consequences:

- **Deliberate.** Simple runes are fully explained by their examples, and a
  table would be ceremony. Then generation applies to a minority of pages and
  the change is small.
- **Drift.** Pages were written before their runes grew attributes, and the
  absence is the same bug as an incomplete table, just total. Then the scope is
  the whole catalogue.

The answer is probably "mostly the first, with some of the second", and
distinguishing them needs a pass over the runes that have non-trivial attributes
but no table. That pass is the first deliverable, not the generator.

## Proposal

A script materialises the reference data, and pages render it:

```
scripts/generate-rune-attributes.mjs
  read    the active rune set, via the same path `check-rune-docs.mjs` uses
  emit    site/content/_data/rune-attributes.json   ← committed, diffable
```

One artifact for all runes; each page selects its own rows:

```markdoc
{% data src="_data/rune-attributes.json" where="rune:snippet scope:own" %}
…per-row template…
{% /data %}
```

The per-row body comes from {% ref "SPEC-127" /%}, which this spec depends on
exactly as SPEC-126 does.

### What the guard becomes

Extend `check-rune-docs.mjs` from coverage to content, keeping its established
two-layer shape — unit tests of the pure drift computation, plus a live check
against the real package set:

- The committed artifact is fresh (regenerate in memory, compare).
- No page hand-writes an attribute table for a rune that has generated rows —
  the failure mode this spec exists to prevent is a page quietly reverting to a
  hand-maintained copy.

## Design decisions

**D1 — Own attributes in the table; universal attributes in an axis accordion,
rendered from a shared partial.**

An earlier draft said "universal attributes are not listed per page; the page
links to their reference". Both halves were wrong.

*There is no reference to link to.* The only pages documenting these attributes
are `extend/theme-authoring/surfaces.md` and `tint-cascade.md`;
`dimensions.md` covers the `data-*` attributes a theme's CSS targets, not the
attributes an author types. So D1 as written would have sent a content author
into the Extend handbook — the exact cross-guide leak WORK-540 existed to close.

*And "a subset per rune" overstates the variance.* Measured across the 51 runes
in the default site:

| | |
|---|---|
| constant core, on all 45 runes that carry any | **24 attributes** — `bg*`, `scrim*`, `substrate*`, `tint`/`tint-mode`, `spacing`, `stagger`, `elevation`, `inset`, `reveal`, `width` |
| `prominence` | 10/45 |
| `reading` + `dropcap` | 8/45 |
| `frame*` (9 attributes) | 4/45 |
| carry none at all | 6 — `badge`, `bg`, `expand`, `icon`, `tint`, `xref` |

Three axes vary; everything else is constant. So the page should render the
**delta**, and the unit of the delta is the *axis*, not the attribute —
`AXIS_ATTRIBUTES` already folds `frame`'s nine attributes and `motion`'s
`reveal`/`stagger` into one entry each, and nine rows for `frame` say exactly
what "carries `frame`" says. More decisively, `universalUnavailable` is *already
keyed by axis*, so an attribute-level table cannot express the "not applicable"
half at all without inventing a decomposition the code does not have.

**The accordion carries both halves with one mechanism**, which a link never
could: a carried axis is an item listing its attributes, an unavailable axis is
an item giving its reason. That is where WORK-535's output finally lands — this
spec previously said the unavailable list *"belongs in a collapsed block"* and
never said where that block was.

Collapsed by default, so the noise objection is answered without hiding
anything: `AccordionItem` headers render as `<summary>`, so the content stays in
the DOM and find-in-page reaches it.

**One partial, not markup on 45 pages.** The accordion is authored once as a
partial taking the rune name, not copied into every page. Drift cost would be
zero either way since it is generated, but the byte cost is not, and changing
the presentation later should be one file. This is the same argument that
retired the `item-template` idea in {% ref "SPEC-127" /%}'s lineage — a partial
does the work and composes better.

**D1a — `SerializedRune` has to carry more than it does.** `attributes.own` and
`attributes.base` are full `SerializedAttribute` records (type, required,
`matches`, description); `attributes.universal` is a bare `string[]`.
`serializeRune` reads `attrDef` for universals and throws it away. An accordion
of names only is barely better than the link, so the serialized shape needs the
full records — and, to match `universalUnavailable`, grouped by axis rather than
flat. That is a change to a stable JSON contract, so it is a decision here
rather than something the implementer discovers.

The per-axis *prose* already exists and cannot drift: every author-facing axis
facet carries a contract `description` (`packages/transform/src/facets/*.ts` —
`tint.ts:93` and its siblings; only `chrome`, `driver` and `modifiers` lack one,
and none of those are author axes). It lives in `@refrakt-md/transform` rather
than the rune reference, so plumbing it through is real work — but it is
authored where the axis is implemented, which is the property that matters.

**D2 — Generated rows, hand-written surroundings.** A rune page is mostly worked
examples and prose, and those stay untouched. Only the table renders from data.
`aggregate.md` is the case to design against: it has *two* tables — a `$item`
variables table and an attributes table — and only the second is generated.

**D3 — The drift guard extends the existing script, it does not add a new one.**
`check-rune-docs.mjs` already answers "do the pages and the runes agree?" for
one meaning of agree. A second script answering a second meaning would split a
question that reads better whole.

## Acceptance Criteria

- [ ] A recorded answer to why 102 pages have no attribute table, and which of them should
- [ ] `scripts/generate-rune-attributes.mjs` emits a committed, byte-stable JSON artifact covering every rune in **every configured site**, not just the default one
- [ ] A test asserts the artifact covers every rune in every site — a generator reading one site would emit a plausible artifact missing all plan runes, and a naive freshness check would pass
- [ ] Pages documenting rune attributes outside `/runes/` are in scope, including `plan/docs/plan-entities.md`
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] Rune pages render their own (and base-preset) attributes from that artifact
- [ ] Universal attributes render as a collapsed accordion with **one item per axis**, not one row per attribute
- [ ] Axes the rune does not carry appear as items giving the reason, from `universalUnavailable`
- [ ] The accordion is a shared partial taking the rune name, not markup repeated across ~45 pages
- [ ] `SerializedRune` carries full attribute records for universals, grouped by axis — not the current bare `string[]`
- [ ] Per-axis prose comes from the facet contract descriptions, not a second hand-written copy
- [ ] The six runes carrying no universal attributes render their posture reason instead of an empty accordion
- [ ] The rendered universal section agrees with `refrakt reference <name>` — same axes carried, same reasons for the rest
- [ ] `check-rune-docs.mjs` gains a content check: the artifact is fresh, and no page hand-writes a table for a rune with generated rows
- [ ] The stale-artifact failure names the command to run
- [ ] Pages with more than one table keep their hand-written ones intact

## Approach

1. **Answer the 102-page question.** Survey runes with non-trivial attributes and
   no table. Cheap, and it sets the scope for everything after.
2. **The script and the artifact.** Small — the data already exists in the shape
   needed.
3. **Convert the pages**, starting with the four BUG-006 fixed by hand, so the
   generated output can be diffed against a known-good result.
4. **Extend the guard.**

Order matters at step 3: converting a page whose table was just corrected proves
the generator reproduces a reviewed result, rather than asking a reviewer to
check a generated table against a schema by eye.

## Open questions

- **How does an unavailable axis read in a summary?** An accordion of thirteen
  items where several say "not applicable" risks reading as thirteen failures.
  The reasons themselves are good prose (*"this rune declares no prose body"*),
  so this is a presentation question — order carried axes first, or mark the
  unavailable ones in the summary — not a data question.
- **Should `HIDDEN_ATTRIBUTES` grow?** It currently holds one entry
  (`feature.split`), so internal `__`-prefixed attributes such as
  `__deferred-body` appear in `reference --format json` for every rune with a
  body. Harmless in the CLI, but a generated table would render them unless
  filtered. Either extend the hidden set or filter by the `__` convention — the
  latter matches the prefix's documented meaning.
- **Child runes.** Five pages document a child rune under a parent's page
  (`bento-cell` under `bento`, and similar), so the page name does not resolve
  to a rune. `check-rune-docs.mjs` already handles this with its `PAGELESS` set;
  the generator needs the same mapping rather than a second list.
- **Does this subsume the `docs/cli/reference.md` question** left open in
  SPEC-126? Both are "generate a reference from data the CLI already has", and
  answering them together may be cheaper than twice.

## References

- {% ref "BUG-006" /%} — the four drifted `/runes/` pages; fix those by hand first, independent of this
- {% ref "BUG-007" /%} — the same drift on `plan/docs/plan-entities.md`, which is what widened this spec's scope beyond the rune catalogue
- {% ref "SPEC-127" /%} — per-row `data` templates; this spec depends on them for rendering
- {% ref "SPEC-126" /%} — the same pattern applied to the configuration reference; shares the script-plus-committed-artifact shape and the enforcement model
- `scripts/check-rune-docs.mjs` — the guard this extends
- WORK-535 — per-rune universal reporting, including unavailable axes and reasons

{% /spec %}
