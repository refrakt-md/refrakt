{% spec id="SPEC-137" status="draft" source="SPEC-094" tags="theme, dimensions, css, testing, drift, dx, lumina, skeleton" %}

# Dimension adoption drift detection

Universal theming dimensions promise that a theme styles a concept once and
every rune follows. That promise is currently unverified in both directions: a
rune may carry per-rune CSS shadowing a dimension that already covers it, and a
theme may carry CSS for a dimension nothing emits. Both classes exist in the
repo today, both went undetected for releases, and neither is visible to the one
instrument we have.

This spec builds the missing instrument.

## Problem

`packages/lumina/test/css-coverage.test.ts` answers one question: **does every
selector the engine generates have CSS somewhere?** It walks the rune configs,
derives the expected BEM selectors, and fails on any that no stylesheet matches,
with `UNSTYLED_BLOCKS` and `KNOWN_MISSING_SELECTORS` as documented escape
hatches.

It cannot answer either of the converse questions, and both have real instances:

**Shadowing — per-rune CSS that duplicates a dimension.**
{% ref "BUG-024" /%}: `howto`, `recipe`, `steps` and `track` each hand-roll a
counter that `[data-sequence="numbered"]` already provides, on elements the
dimension already reaches (`annotateSequence` recurses, and all four are
`<ol>`/`<li>`). The rules land at different specificities, so a theme restyling
the dimension affects two of the four and is silently ignored by the other two.

**Orphans — theme CSS for something nothing emits.**
{% ref "BUG-023" /%}: `data-meta-rank` is specified in {% ref "SPEC-026" /%} and
{% ref "SPEC-079" /%} and styled by four rules in Lumina's `density.css`, and no
code path sets the attribute. Density compaction silently does nothing.

Both survived because the coverage test's direction is the one that catches
*missing* style, and neither of these is missing style. They are style that
does not do what its author believed.

The migration culture already exists — `KNOWN_MISSING_SELECTORS` is full of
entries like *"now styled by shared metadata dimension rules
(`[data-meta-type]`)"* and *"styled via `[data-section="header"]` dimension"*.
Runes have been moved onto dimensions deliberately and repeatedly. What is
missing is anything that notices when a rune *wasn't*.

## Design

Four checks over two vocabularies — dimensions (D2, D3) and measures (D4) —
sharing one manifest and one allowlist discipline.

### D1 — the dimension manifest

Both checks need to know what a dimension is: its attribute, its value set, and
which CSS properties its rules own. Today that knowledge is spread across the
dimension stylesheets, the engine, and `dimensions.md`.

{% ref "SPEC-124" /%} is the precedent and the enabler. It moved the universal
axes into a facet registry precisely because their vocabularies were "stranded
from their use" — `ELEVATION_VALUES` sat 600 lines from the code resolving
elevation and was never read at all. The same treatment applies here: each
dimension declares its attribute name, its closed value set, and the property
set its rules govern, in code rather than in prose.

### D2 — shadowing check

For each per-rune CSS rule, determine whether it sets a property that a
dimension already sets on an element that would carry that dimension's
attribute. Report it, and require either removal or an allowlist entry with a
reason.

Matching is **structural, not a cascade simulation.** Attempting to model
specificity and layer order to decide which rule actually wins would be fragile
and would miss the point: even when the bespoke rule wins, the duplication is
the defect, because it makes the dimension's behaviour rune-dependent.

The conservative test is a three-way intersection:

1. the rune's config declares the dimension (e.g. `sequence: 'numbered'`), so
   its elements carry the attribute;
2. a per-rune selector targets an element in that subtree;
3. its declaration block sets a property the dimension's rules also set.

False positives are expected and are handled by the allowlist, in the same
spirit as `KNOWN_MISSING_SELECTORS` — the value is in making the exception
explicit and reviewed.

### D3 — orphan check

For each `[data-*]` selector in theme and skeleton stylesheets, confirm the
attribute is one the engine can emit, and that the value is in the dimension's
declared set. An attribute nothing emits, or a value outside the vocabulary, is
reported.

This is the cheaper of the two and catches {% ref "BUG-023" /%} outright. It also
guards against value typos, which today fail silently.

### D4 — measure checks ({% ref "ADR-033" /%})

Measures are custom properties drawn from a registered vocabulary, and they rot
the same two ways. The same instrument covers them with two more checks:

- every `--rf-`-prefixed property appearing in a `styles` entry resolves to a
  registered measure — an unregistered one is the orphan case (D3) in custom-
  property form;
- every registered measure has at least one consumer — an unused entry is
  vocabulary that outlived its need, the shadowing case (D2) inverted.

The measure registry is the same kind of artifact as D1's dimension manifest and
should live beside it.

### D5 — scope

The checks run over the dimension stylesheets and per-rune stylesheets of any
package that opts in — Lumina and skeleton at minimum, and `proof-skin` as the
second theme, which makes the check meaningful rather than Lumina-specific.

## Non-goals

- **Not a general CSS linter.** The only question is dimension adoption.
- **Not specificity simulation.** See D2.
- **Not automatic fixing.** Both bugs need human judgement about which half is
  the defect; the instrument reports, a person decides.

## Acceptance Criteria

- [ ] A dimension manifest exists in code, declaring each dimension's attribute, closed value set, and governed property set
- [ ] The shadowing check reports the four duplicated counter blocks in {% ref "BUG-024" /%}
- [ ] The orphan check reports the four dead `data-meta-rank` rules in {% ref "BUG-023" /%}
- [ ] Both checks run against Lumina and proof-skin, not Lumina alone
- [ ] Both support an allowlist whose entries carry a written reason, following the `KNOWN_MISSING_SELECTORS` precedent
- [ ] The suite passes with the two known bugs allowlisted, so it can land before either fix
- [ ] An unregistered `--rf-`-prefixed property in a `styles` entry is reported ({% ref "ADR-033" /%})
- [ ] A registered measure with no consumer is reported
- [ ] `dimensions.md` documents the checks and when to add an allowlist entry

## Blocks

- {% ref "BUG-024" /%}
- {% ref "BUG-023" /%}

## Open questions

**Where do the checks live?** `css-coverage.test.ts` is in `packages/lumina/test/`
and is Lumina-specific by location, though its subject is really the
skeleton/skin contract. If the new checks are to run over proof-skin too, a
shared home is wanted — possibly `packages/skeleton/test/`, which is where the
layer contract already lives.

**How much of the property-set mapping can be derived rather than declared?**
Parsing the dimension stylesheets to discover which properties each rule sets
would keep the manifest honest automatically. It is also more machinery. Worth
prototyping before committing to hand-maintained property sets, which would
themselves be a drift surface.

## References

- {% ref "SPEC-094" /%} — theme system foundations; the skeleton/skin split these checks police
- {% ref "SPEC-124" /%} — facet registry; the precedent for moving stranded vocabularies into code
- {% ref "SPEC-079" /%} — semantic header zones; where `data-meta-rank` was designed
- {% ref "SPEC-026" /%} — Lumina theme; the other place `data-meta-rank` is specified
- {% ref "ADR-029" /%} — the contract half of the same drift problem

{% /spec %}
