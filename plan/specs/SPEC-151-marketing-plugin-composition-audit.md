{% spec id="SPEC-151" status="draft" tags="runes, composition, marketing, plugins, feasibility, seo" %}

# Marketing plugin composition audit

## Summary

Fifth plugin audited against {% ref "SPEC-145" /%}, and the largest at **2,991 lines** —
more than storytelling. It has no pipeline hooks and no `postTransform`, which are the
two things that made storytelling and design hard, and it is still the **second plugin
that stays a plugin**, for an entirely different reason: it carries **three custom
content models**, more than any other, and they are three different shapes of hard.

Its most valuable output is not the verdict. Measuring one property pattern across the
whole corpus quantified what {% ref "SPEC-146" /%} Problem 2 is actually worth, which
four audits had circled without counting.

## The finding worth more than the verdict

Every audit so far has hit the same B-intrinsic case: `headline` and `blurb` harvested by
`pageSectionProperties` from authored content, mapped to schema.org `name` and
`description`, and lost across a composition boundary. `event` in places,
`organization` in business, and now `pricing` here.

Counted precisely across every rune in the repo — 22 use `pageSectionProperties`, and
**six map it into a schema table**:

| Plugin | Rune | Note |
|---|---|---|
| docs | `symbol` | |
| learning | `howto` | composable — see the correction below |
| learning | `recipe` | composable — see the correction below |
| marketing | `pricing` | |
| places | `event` | {% ref "SPEC-148" /%}'s measured case |
| business | `organization` | reached through an `orgProperties` indirection, which a naive search misses |

So **six live cases across five plugins**, all failing identically, all on the same two
properties. That is what SPEC-146 Problem 2 buys: not an abstract reachability gap, but
`name` and `description` on six entity runes that otherwise compose. It is the single
strongest argument for scheduling that spec, and no individual audit could see it.

**Correction.** An earlier draft of this table excluded `howto` and `recipe` as "already
excluded from composition by {% ref "SPEC-143" /%} D4", giving four. That was wrong. D4's
test — *"does every output slot come from exactly one resolved field, wrapped but not
restructured?"* — gates whether a rune can **shed its transform** on the *declared* emit
path. Composition does not shed a transform; it replaces one with a template, which is a
different mechanism with a different gate. D4 says nothing about composability, and both
runes are in fact composable — see {% ref "SPEC-145" /%} D18.

## Per-property, for the two schema-bearing runes

### `pricing` — `Product`

| Property | schema.org | Source | Path | Composed |
|---|---|---|---|---|
| `headline` | `name` | `pageSectionProperties(header)` | **B-intrinsic** | **lost** |
| `blurb` | `description` | `pageSectionProperties(header)` | **B-intrinsic** | **lost** |
| `tier`, `featured-tier` | `offers` | child runes | E | ✓ |
| — | `lists: ['offers']` | root attribute | — | ✓ |

### `tier` — `Offer`, and the first derived-data case outside design

| Property | schema.org | Source | Path | Composed |
|---|---|---|---|---|
| `name` | `name` | `attrs.name` | A / B-by-choice | ✓ |
| `parsedPrice` | `price` | **computed** from `attrs.price` via `NAME_PRICE_PATTERN` | — | **blocked** |
| `resolvedCurrency` | `priceCurrency` | **computed** from `attrs.price` + `attrs.currency` | — | **blocked** |

`parsedPrice` and `resolvedCurrency` do not exist as authored values; the rune parses
`"$29/mo"` into a number and a currency code. That is {% ref "SPEC-150" /%} D2's
derived-data blocker at small scale — and its presence here matters, because design's
`design-context` could be dismissed as a one-off. It is not: **a rune that computes a
schema value from an authored string cannot be composed**, and this is a second instance
in a different plugin.

The source comment is worth keeping: *"`parsedPrice` and `resolvedCurrency` survived only
because the rune declared them in `schema:`"* — they are invisible in the output
otherwise.

### `testimonial` — `Review`, the most entity-rich table audited

| Source | schema.org | Origin | Path | Composed |
|---|---|---|---|---|
| `quote` | `reviewBody` | ref from the authored blockquote | **B-intrinsic** | **lost** |
| `author-name` | nested `Person.name` | ref | D (node) | **lost** |
| `author-role` | nested `Person.jobTitle` | ref | D (node) | **lost** |
| `rating` | nested `Rating.ratingValue` | `attrs.rating` → `properties` meta | D (bag) | ✓ |

Two nested entities, and they split on exactly the line {% ref "SPEC-149" /%} D1 drew:
`rating` rides the bag and survives, the author pair are refs and do not. Whether the
author pair is B-intrinsic or B-by-choice depends on whether testimonial takes author
attributes — worth confirming before migration, since it decides whether testimonial is
gated on SPEC-146 or free.

## The three custom content models, in increasing order of hardness

**`definition`'s `splitDefinitionChildren`** — *"Splits children into term (headings +
paragraphs with image/icon/strong) and description (remaining paragraphs)."* A two-way
split on a node predicate: leading matching nodes, then the rest. This is the
segmentation family {% ref "SPEC-147" /%} Finding 2 proposes a `segmented` model for, with
a richer boundary predicate than "node type". Plausibly reachable; the predicate is the
open question.

**`bento`'s inline `processChildren`** — cascades a grid-level `media-position` attribute
down to cells that do not set their own, so each cell's default depends on the parent's
attribute. That is not arrangement and not segmentation: it is **computing child
attributes from parent attributes**. A `childDefaults` declaration is imaginable, and
would want its own justification rather than being invented for one rune.

**`comparison`'s `convertComparisonChildren`** — *"Multi-pass heading+list parser with
cross-column row alignment. Converts headings to columns, list items to rows with bold
labels for alignment, blockquotes to callouts, and builds a master label list for
cross-column row matching."*

This is the hardest content model in the codebase. It is not a pass over children; it is a
**global computation over the whole child set** — building a master label list, then
aligning rows across columns against it. No plausible declarative vocabulary expresses
it, and {% ref "ADR-036" /%} says one should not be invented to. `comparison` is a
permanent plugin rune.

## The rest

| Rune | Verdict |
|---|---|
| `hero`, `cta` | Compose — no schema, `pageSectionProperties` refs carry no schema weight here |
| `steps` | Composes — already uses `sequence: 'numbered'` declaratively, no `postTransform` |
| `feature` | Needs `definition`'s split model |
| `bento` | Needs the attribute cascade, or stays |
| `pricing` | Gated on SPEC-146; its `tier` child blocked by derived data |
| `testimonial` | Partly gated; see the table |
| `comparison` | Permanent plugin rune |

Marketing also carries **five of the thirteen `requiresParent` children** —
`BentoCell`→`Bento`, `Definition`→`Feature`, `Step`→`Steps`, `Tier` and
`FeaturedTier`→`Pricing` — more than any other plugin. Per {% ref "SPEC-145" /%} D12 that
is a constraint on *how* to compose these, not a bar: the template places the parent and
lets its content model produce the children.

And **no misfiled capability.** Every rune here is marketing-domain; nothing needs a
client lifecycle, a behavior or a pipeline hook. Second plugin after business with
nothing to relocate — which continues to support "at most one", not "always one".

## Decisions

### D1 — marketing stays a plugin, on `comparison` alone

Even if everything else composed, `comparison`'s cross-column alignment would keep the
plugin alive. Recorded so the question is not reopened each time the vocabulary grows.

### D2 — derived data is confirmed as a general blocker, not a design-plugin quirk

`tier`'s `parsedPrice` / `resolvedCurrency` is the second instance, in a different plugin,
at a much smaller scale than `design-context`. {% ref "SPEC-150" /%} D2 stands as stated
and this spec is its corroboration.

### D3 — the `pageSectionProperties` headline/blurb pattern is SPEC-146's headline case

Six live runes across five plugins fail identically on the same two properties. Any work
on {% ref "SPEC-146" /%} Problem 2 should be measured against all six, not against one,
and `event` remains the reference fixture ({% ref "SPEC-148" /%} D4) because it is
measured. The count was four in an earlier draft; the correction above says why.

### D4 — `comparison` is not a candidate for a richer content-model vocabulary

Distinct from D1. The temptation on seeing three custom models in one plugin is to
generalise all three. Two are worth examining (`definition`'s split, `bento`'s cascade);
`comparison` is a computation over the whole child set and generalising it would be
inventing an expression language for one consumer, which {% ref "ADR-036" /%} forbids.

## Implementation notes, deliberately not yet work items

1. **Confirm `testimonial`'s author sources** — attributes or content? It decides whether
   testimonial is gated or free, and the tables above leave it open.
2. **Compose `hero`, `cta`, `steps`** — unblocked, and the largest set of unblocked runes
   in any plugin audited.
3. **Weigh `definition`'s split** against {% ref "SPEC-147" /%}'s `segmented` model — a
   predicate boundary rather than a node-type boundary may be the same feature or a
   second one.
4. **Leave `bento` and `comparison`.**

## Non-goals

- Deleting `plugins/marketing/` — it stays (D1)
- Generalising `comparison`'s content model (D4)
- Auditing `learning`, `media` and `docs`
- Resolving whether `bento`'s attribute cascade deserves a declarative form; it needs its
  own evidence, not this rune alone

## Acceptance Criteria

- [ ] `hero`, `cta` and `steps` exist as compositions with fixtures, matching the plugin's recorded baseline
- [ ] `testimonial`'s author-name and author-role sources are determined and its row in the table above is closed
- [ ] `pricing` composes after SPEC-146 with `name` and `description` publishing, and its `tier` children still typed as `offers` via path E
- [ ] `tier` is either left in the plugin or its price parsing moved to an authored attribute pair, with the choice recorded (D2)
- [ ] All six live `pageSectionProperties` cases — `symbol`, `howto`, `recipe`, `pricing`, `event`, `organization` — are verified together when SPEC-146 Problem 2 lands (D3)
- [ ] `plugins/marketing/` is unchanged and passing its tests until an explicit decision
- [ ] The authoring guide's blocker list cites `tier` alongside `design-context` for derived data, so the category does not read as design-specific

## References

- {% ref "SPEC-150" /%} — the design audit; the derived-data blocker this spec corroborates
- {% ref "SPEC-149" /%} — the business audit; B-intrinsic / B-by-choice, and `organization`'s instance of the headline pattern
- {% ref "SPEC-148" /%} — the places audit; the per-property method and `event`, the measured reference case
- {% ref "SPEC-147" /%} — the storytelling audit; the `segmented` model `definition` would need
- {% ref "SPEC-146" /%} — name resolution across boundaries; D3 quantifies its payoff
- {% ref "SPEC-145" /%} — composed runes; D12's `requiresParent` constraint, five of whose thirteen live here
- {% ref "ADR-036" /%} — why `comparison` is not generalised

{% /spec %}
