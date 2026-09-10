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

## Answered: the missing tables are drift, not editorial restraint

This spec asked why so few rune pages carry an `## Attributes` section, offered
"mostly deliberate, some drift" as the likely answer, and made settling it the
first deliverable. {% ref "WORK-547" /%} settled it. **The guess was wrong, and
in the direction that widens scope.**

Surveyed across both configured sites (`main` and `plan`), 118 runes:

| | |
|---|---|
| runes with ≥1 own or base-preset attribute | **108** |
| …whose page carries an `## Attributes` section | **18** |
| …with a page and **no** table | **72** |
| …that are child runes, documented on a parent's page | 16 |
| runes with **zero** own/base attributes | 10 |
| …of those, carrying a table anyway | **0** |

The "deliberate" hypothesis makes a prediction: untabled runes should be the
simple ones, fully explained by an example. It fails. The untabled set includes
`bg` (15 own attributes), `grid` (13), `sandbox` (12), `work` (12), `bug` (10) —
and **17 runes with at least one *required* attribute**, among them `bond`
(`from`, `to`), `swatch` (`color`, `label`), `embed` (`url`), `form` (`action`),
`api` (`path`), and all five plan entity runes.

A required attribute that appears in no table is the same defect
{% ref "BUG-006" /%} found on `xref` — the reader cannot learn the rune has a
mandatory input — except here it is the norm rather than the exception.

What *is* deliberate is the other end: all 10 runes with no attributes have no
table. Existing practice is right exactly where it is defensible and absent
everywhere else, which is the signature of drift, not judgment.

### The rule

**A page carries a generated attribute table when its rune has at least one own
or base-preset attribute.** All 108. Child runes' tables go on their parent's
page, placed via D5's map.

That is simpler than the threshold this spec's work item originally proposed
("more than one own attribute, or any required one"), and the survey is why.
A threshold made sense when tables were hand-written and each one cost effort to
write and maintain. Generated, a one-row table costs nothing — so a threshold
buys only *less content*, at the price of a rule to remember and a reader who
cannot tell whether a missing table means "this rune has no attributes" or "it
has some, but not enough to qualify". Zero is the only cutoff that is
self-evident from the page.

### What the survey also turned up

Two defects in the data source, both filed as {% ref "BUG-009" /%} and both
blocking this spec's generator:

- `reference dump` emits `music-playlist` / `music-recording` as runes that
  `reference <name>` cannot resolve — the artifact would carry phantom entries.
- `EXCLUDED_RUNES` hides nine core child runes (`accordion-item`, `tab`,
  `form-field`, …) from every reference output, while twenty equivalent plugin
  child runes are reported in full. Their attributes cannot be generated at all
  until the two lists agree.

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
links to their reference". A link is necessary and not sufficient.

*The reference exists and should be linked.* `site/content/runes/surfaces.md`
is a substantial author-facing page — the surface model, the vocabulary, what
each axis means — and the accordion should point at it rather than restate it.
An earlier revision of this decision claimed no such page existed; that was
wrong, from a truncated search, and is corrected here.

**The link is per-axis, not one URL.** surfaces.md covers 8 of the 12 axes,
organised by editorial theme (Chrome, Reading, Fills, Cover); `motion` has its
own page at `/runes/motion`; and `spacing` / `inset` are documented nowhere at
all — see {% ref "BUG-008" /%}, which this decision surfaced. So each accordion
item carries its own destination, from a small axis→page map. That map is also
the thing that makes the gap checkable: assert every axis in `AXIS_ATTRIBUTES`
has an entry and a new axis cannot ship undocumented.

*What the link cannot carry is per-rune applicability*, and surfaces.md says so
itself:

> To see what a given rune accepts, run `refrakt reference <rune>` — it lists
> that rune's real universal attributes and names the reason for each axis it
> leaves out.

That is the gap. The vocabulary page is documented; *whether this rune honours
this axis* is answerable only by running a CLI command. A reader on
`/runes/card` should not have to. Since 0.32.0 the schema knows the answer, so
the page can render it.

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

Given that surfaces.md already explains each axis well, the facet descriptions
may turn out to be a one-line summary rather than the item's substance — an
accordion item arguably needs only *this rune carries `tint`, `tint-mode`* plus
a link to the concept. **Try the link-only form first**; if the items read as
bare name lists, add the facet prose. That ordering keeps the D1a plumbing
optional rather than assumed.

**D1b — Unavailable axes are a grouped note, not accordion items.**

The accordion holds only the axes a rune *carries*. Axes it does not carry
render as a short uncollapsed note beneath it, grouped by reason — one line per
reason.

Making them items was the obvious first shape and the distribution rules it out.
Per rune, across the 51 runes in the default site:

| carried / unavailable axes | runes |
|---|---|
| 8 / 4 | 28 |
| 9 / 3 | 8 |
| 10 / 2 | 5 |
| 11 / 1 | 4 |
| **0 / 12** | **6** |

For 55% of the catalogue a third of the accordion would be negative space, and
the six inline runes would get twelve consecutive "not applicable" items and
nothing else — a section that says no twelve times.

Grouping by reason collapses that, because the reasons are far fewer than the
axes. No rune has more than **three** distinct reasons (11 runes have one, 12
have two, 28 have three), and `badge`'s twelve unavailable axes share exactly
one:

```
bg, dropcap, elevation, frame, inset, motion, prominence,
reading, spacing, substrate, tint, width:
  this rune is inline — the block-level universal axes have
  nothing to act on
```

Four consequences, which is why this beats the alternatives of reordering the
items or marking their summaries:

1. The worst case inverts — twelve negative items become one sentence that
   teaches something.
2. **The six zero-universal runes stop being a special case.** No carried axes
   means no items, so the accordion is simply not rendered and the note stands
   alone. The behaviour D1 wanted falls out of the rule instead of a branch.
3. More discoverable, not less: uncollapsed prose beats a collapsed item.
4. It makes the page and `refrakt reference <name>` the *same shape* — the CLI
   already prints `Universal attributes: …` followed by `Not applicable to this
   rune:` grouped by reason (`reference.ts:251-276`). The agreement criterion
   below stops being an awkward cross-medium comparison, and WORK-535's design
   reasoning carries over rather than being re-argued.

Rejected: items only when there are few (1–2), a note otherwise. An inconsistent
page shape across the catalogue costs more than it saves — a reader should learn
this layout once.

**D2 — Generated rows, hand-written surroundings.** A rune page is mostly worked
examples and prose, and those stay untouched. Only the table renders from data.
`aggregate.md` is the case to design against: it has *two* tables — a `$item`
variables table and an attributes table — and only the second is generated.

**D3 — The drift guard extends the existing script, it does not add a new one.**
`check-rune-docs.mjs` already answers "do the pages and the runes agree?" for
one meaning of agree. A second script answering a second meaning would split a
question that reads better whole.

**D4 — Filter internal attributes by the `__` prefix, at the source.**

Measured: exactly one `__`-prefixed attribute reaches
`reference --format json` — `__deferred-body`, on exactly **three** runes
(`aggregate`, `collection`, `relationships`). No other underscore-prefixed
attributes leak. An earlier revision of this spec said "every rune with a body";
that was wrong.

Growing `HIDDEN_ATTRIBUTES` would work today — three entries. Filter by prefix
instead, for two reasons:

- **`HIDDEN_ATTRIBUTES` is keyed `rune.attribute`**, so it needs one entry per
  rune and a new one every time a rune opts into `deferBody` — added silently,
  or not at all. The failure is a `__deferred-body` row appearing in a generated
  table because nobody remembered.
- **The two mechanisms mean different things.** `feature.split` is a real,
  public attribute we choose not to document — an editorial call.
  `__deferred-body` was never public; SPEC-070 stashes it on the AST as an
  implementation detail (`DEFERRED_BODY_ATTR` in `deferred-body.ts`). One list
  holding both conflates "undocumented on purpose" with "not an author
  attribute at all".

**Filter in `serializeRune`, not in the generator.** Anyone running
`reference aggregate --format json` sees `__deferred-body` today; that is noise
for every consumer, not just this one. Fixing it at the source fixes it once.
Treat it as a small bug the generator happens to have found.

Caveat: `__` is a convention with one member, so this is really "filter by
prefix *and* keep the prefix meaningful" — say so where `DEFERRED_BODY_ATTR` is
defined.

**D5 — `PAGELESS` becomes a Map, not a second list.**

`scripts/check-rune-docs.mjs` already tracks runes with no page of their own —
about thirty, child runes plus two internal ones. Each is annotated with its
parent **in a comment**:

```js
'bento-cell',   // marketing/bento
'tier',         // marketing/pricing
```

Coverage is all the existing guard needs, so a comment suffices. The generator
needs more: to place a child rune's attributes on its parent's page, the parent
has to be *data*. Promote the comments to values rather than adding a parallel
list that can disagree with this one.

Two entries have no parent — `error` and `region` are internal, never authored
directly (`region` is documented in `layout.md`). They need a distinct value, not
a missing one: "documented on the parent's page" and "no table anywhere" are
different answers, and a Map that cannot tell them apart will quietly do the
wrong thing for one of them.

**D6 — This does *not* subsume `docs/cli/reference.md`.**

Closing SPEC-126's open question: no, and they should not be done together.

`docs/cli/reference.md` is not a whole-CLI reference. It is a 116-line page about
the single `refrakt reference` command, with three flag tables — 18 rows in
total.

The blocker is the source of truth. Rune attributes come from schemas, which are
already data. **The CLI has no structured command surface at all** — no command
registry, no flag declarations; argument parsing and `--help` text are written by
hand per command. There is nothing to generate *from*. Building one means
restructuring how every command declares its flags and deriving both `--help` and
the docs from that. Worth doing, plausibly; but it is its own spec, not a rider
on this one, and it shares no machinery with generating rune tables.

If CLI-doc drift is the worry, the cheap guard is the one already exercised
during this milestone's survey: parse the documented flags out of the page and
assert each appears in that command's source. Run ad hoc against the plan
commands it came back 27/27 clean. A fraction of the cost, and it catches the
failure that actually occurs.

## Acceptance Criteria

- [x] A recorded answer to why so many pages have no attribute table, and which of them should — WORK-547: drift, and all 108 runes with attributes should
- [ ] {% ref "BUG-009" /%} is fixed first — the generator's data source currently carries phantom runes and omits nine child runes
- [ ] `scripts/generate-rune-attributes.mjs` emits a committed, byte-stable JSON artifact covering every rune in **every configured site**, not just the default one
- [ ] A test asserts the artifact covers every rune in every site — a generator reading one site would emit a plausible artifact missing all plan runes, and a naive freshness check would pass
- [ ] Pages documenting rune attributes outside `/runes/` are in scope, including `plan/docs/plan-entities.md`
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] Rune pages render their own (and base-preset) attributes from that artifact
- [ ] Universal attributes render as a collapsed accordion with **one item per carried axis**, not one row per attribute
- [ ] Axes the rune does not carry are **not** items — they render as an uncollapsed note beneath, grouped by reason, one line each
- [ ] The accordion is a shared partial taking the rune name, not markup repeated across ~45 pages
- [ ] `SerializedRune` carries full attribute records for universals, grouped by axis — not the current bare `string[]`
- [ ] Each accordion item links to that axis's documentation, from an axis→page map — not one shared URL, since `motion` lives on its own page and two axes have none
- [ ] A test asserts every axis in `AXIS_ATTRIBUTES` has a documentation entry, so a new axis cannot ship undocumented
- [ ] Per-axis prose, **if the items need it**, comes from the facet contract descriptions rather than a second hand-written copy — try the link-only form first
- [ ] The six runes carrying no universal attributes render no accordion at all — just their one-line posture reason
- [ ] Internal `__`-prefixed attributes are filtered in `serializeRune`, so every consumer benefits, not only this generator
- [ ] `PAGELESS` carries each child rune's parent as data rather than a comment, with `error` / `region` distinguishable from child runes
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

## References

- {% ref "BUG-006" /%} — the four drifted `/runes/` pages; fix those by hand first, independent of this
- {% ref "BUG-007" /%} — the same drift on `plan/docs/plan-entities.md`, which is what widened this spec's scope beyond the rune catalogue
- {% ref "SPEC-127" /%} — per-row `data` templates; this spec depends on them for rendering
- {% ref "SPEC-126" /%} — the same pattern applied to the configuration reference; shares the script-plus-committed-artifact shape and the enforcement model
- `scripts/check-rune-docs.mjs` — the guard this extends
- WORK-535 — per-rune universal reporting, including unavailable axes and reasons

{% /spec %}
