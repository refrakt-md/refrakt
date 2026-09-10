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

**D1 — Own attributes only; universal attributes link out.** Every rune carries
a dozen-plus universal axes (`tint`, `bg`, `width`, `reading`, …). Listing them
per page is noise that would bury the two or three attributes a reader came for.
`serializeRune`'s own / base / universal split already models this, so the page
renders `own` (plus `base` where a preset contributes) and links to the
universal-attribute reference.

WORK-535 makes a second option available that did not exist before: reporting
the universal axes a rune *lacks*, with the reason. That is genuinely useful —
its own commit message notes that *"why is `reading` on textblock but not card?"
is the question a bare omission leaves unanswered* — but it belongs in a
collapsed block, not the primary table.

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
- [ ] `scripts/generate-rune-attributes.mjs` emits a committed, byte-stable JSON artifact covering the active rune set
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] Rune pages render their own (and base-preset) attributes from that artifact
- [ ] Universal attributes are not listed per page; the page links to their reference
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

- {% ref "BUG-006" /%} — the four drifted pages; fix those by hand first, independent of this
- {% ref "SPEC-127" /%} — per-row `data` templates; this spec depends on them for rendering
- {% ref "SPEC-126" /%} — the same pattern applied to the configuration reference; shares the script-plus-committed-artifact shape and the enforcement model
- `scripts/check-rune-docs.mjs` — the guard this extends
- WORK-535 — per-rune universal reporting, including unavailable axes and reasons

{% /spec %}
