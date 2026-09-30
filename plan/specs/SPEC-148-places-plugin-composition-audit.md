{% spec id="SPEC-148" status="draft" tags="runes, composition, places, plugins, feasibility, seo" %}

# Places plugin composition audit

## Summary

The second plugin audited against {% ref "SPEC-145" /%}, after
{% ref "SPEC-147" /%}'s storytelling. Places is 960 lines across three runes and
three children, and the result differs from storytelling's in a way worth having in
writing: **it does not retire, it splits.** Two runes compose; one never can, because
it is not a domain rune at all.

It also establishes the **per-property** audit method, because per-rune verdicts proved
unstable — twice in the course of this audit a rune was called composable or blocked on
the strength of one property, when its other properties took different paths.

## Why per-property, not per-rune

A schema row's source resolves through one of five paths, and only one of them is broken
by composition ({% ref "SPEC-146" /%}, Problem 2). Which path a *property* takes is a
property of that property, not of its rune — so a rune with four properties can be three
parts fine and one part broken, and a per-rune verdict is a coin toss on which property
you happened to look at first.

| Path | Resolver | Across a composition boundary |
|---|---|---|
| **A** — `properties` from an attribute | `stamp` → bag fallback (`schema-table.ts:309-312`) | works |
| **B** — `properties` from a node | `findAllByName` (`:235`) | **fails silently** |
| **C** — `text` | `findByName`, same walk | **fails silently** |
| **D** — `entities` | `buildEntity` — node first, then bag (`:384-395`) | node source fails, attribute source works |
| **E** — `children` | `findChildren` (`:528`) | works, and over-matches (SPEC-146 Problem 1) |

`event` is the clearest demonstration in the codebase, and its own source comment says
so: *"`location` … exists only as an attribute value, so the applier rebuilds a carrier
from the field bag rather than stamping a node. `headline` / `blurb` come from
`pageSectionProperties` and survive as refs, so those stamp in place. **One table, three
of the mechanism's resolution paths.**"*

## The audit

### `event` — three paths in one table, one of them blocked

| Property | schema.org | Source | Path | Composed |
|---|---|---|---|---|
| `headline` | `name` | ref from `pageSectionProperties` | **B** | **lost** |
| `blurb` | `description` | ref from `pageSectionProperties` | **B** | **lost** |
| `date` | `startDate` | attribute → `properties` meta | A | ✓ |
| `endDate` | `endDate` | attribute → `properties` meta | A | ✓ |
| `url` | `url` | attribute → `properties` meta | A | ✓ |
| `location` | nested `Place.name` | attribute → `entities` | D (attribute) | ✓ |

Measured against today's applier, the same table over a declared and a composed tree:

```json
// declared
{ "@type": "Event", "name": "Tech Conference 2025", "description": "Three days of talks.",
  "startDate": "2025-06-15", "endDate": "2025-06-17", "url": "https://example.com/register",
  "location": { "@type": "Place", "name": "San Francisco, CA" } }

// composed — the header placed inside a {% card %}
{ "@type": "Event", "startDate": "2025-06-15", "endDate": "2025-06-17",
  "url": "https://example.com/register",
  "location": { "@type": "Place", "name": "San Francisco, CA" } }
```

So a composed `event` loses precisely the two properties that identify it, while the
nested `Place` — the part that *looks* hardest — survives, because it is attribute-sourced.
**`event` composes only after SPEC-146.**

### `itinerary` / `itinerary-day` / `itinerary-stop` — no schema, no blockers

Emits nothing, deliberately. The baseline fixture records why: *"Group A, resolved — no
longer emits ItemList. The two days of structured stops reach a list only once each day
is a ListItem and each stop something like a TouristAttraction: per-child typing, not a
flat mapping (WORK-567)."*

No schema row means none of the five paths applies, so **it composes today**. Two further
findings:

- **The node→attribute path is already declarative here.** `itinerary-day`'s content
  model uses `headingExtract` to split `9:00 AM – Ferry Building` into `time` and
  `location` by pattern, then `emitAttributes: { time: '$time', location: '$location' }`.
  That is SPEC-145 D4a's mechanism, already shipping and already in use — not something
  composition needs invented for it. The pattern is {% ref "ADR-036" /%}'s
  restricted-grammar exception, applied to headings rather than list items.
- **`sequence: 'connected'` is already declarative**, so unlike `plot`
  ({% ref "SPEC-147" /%} Finding 1) itinerary has no `postTransform` to retire.

Composition could also *improve* on the plugin here: the per-child typing WORK-567 leaves
open is a `children` row, path E, which works across a boundary today.

### `map` — never, and it is the wrong question

One custom content model in the plugin (`convertMapChildren`), but the content model is
the lesser problem. `packages/svelte/src/registry.ts:7` lists the runes *"requiring
client-side lifecycle"*: **Diagram, Map, Nav, Sandbox**. `map` has a Svelte component
override and `interactive: true` in its config. A composed rune has neither component nor
behavior (SPEC-145 D2), so composition cannot reach it at any point on any roadmap.

Half of `convertMapChildren` — the heading-based grouping — is the same `segmented`
content model SPEC-147 Finding 2 proposes. The other half, coordinate extraction into
pins feeding a live map, is what the component is for.

## The cross-audit finding

Running the audit twice produces the same shape, and it is worth more than either
result:

> **A domain plugin is mostly domain *content*, which composes — plus one misfiled
> *capability*, which does not and never will, because it was never domain-specific.**

| Plugin | Composes | Misfiled capability | Belongs |
|---|---|---|---|
| storytelling | character, realm, faction, lore, bond, plot | `storyboard` — captioned media | core, beside `gallery` |
| places | event (gated), itinerary ×3 | `map` — client lifecycle | core, beside `diagram` / `nav` / `sandbox` |

So the audit's output is not *retire or don't*. It is **which runes leave the plugin, and
where they go** — and in both cases the resident that cannot leave via composition is the
one that was misfiled in the first place.

Places therefore does not retire. What remains after `event` and `itinerary` compose and
`map` relocates is nothing: the *plugin* dissolves, which is a different and cleaner
outcome than storytelling's.

## A composition constraint this audit uncovered

Answering "could a composed `event` put an optional image in `{% card %}`'s media slot?"
turned up a rule that belongs in SPEC-145 and was not there.

`card` splits its body on `---` into media / body / footer via `splitMediaBodyFooter`
(`packages/runes/src/tags/common.ts:160-173`), which iterates a **flat AST node list**
checking `n.type === 'hr'` and does **not recurse**. Content models match AST children
*before* transformation, so `{% if %}` is still an unresolved tag node at that point.

**Therefore a template cannot conditionally emit a structural delimiter.** This does not
work:

```md
{% card %}
{% if $slots.image %}
{% slot name="image" /%}
---
{% /if %}
…body…
{% /card %}
```

The `hr` is nested inside the `if` node and invisible to the split. The correct form emits
both unconditionally and relies on the consuming rune's empty-zone guard — `card.ts:111`
is `if (mediaNodes.length > 0)`, so an absent image yields an empty media zone that card
omits:

```md
{% card %}
{% slot name="image" /%}
---
…body…
{% /card %}
```

**The general rule:** a template's `{% if %}` hides everything it wraps from a nested
rune's content model. Use it around whole rune invocations and around content, never
around anything a nested rune matches structurally — delimiters, and positional
`sequence` fields alike. This bounds SPEC-145's slot-presence conditional in a way that
is easy to get wrong and silent when you do.

## Decisions

### D1 — audits are recorded per property, not per rune

The five-path table is the unit. A per-rune verdict was wrong twice in this audit alone,
in both directions, because a rune's properties take different paths.

### D2 — places dissolves rather than retires

`event` and `itinerary` become compositions; `map` relocates to core beside the other
client-lifecycle runes. No `plugins/places/` remains. Same replace-not-delete staging as
{% ref "SPEC-147" /%} D1 — the composed implementations ship alongside until an explicit
later decision.

**Superseded by {% ref "ADR-039" /%}: places becomes a pack, it does not dissolve.** This
decision reasoned about the *code* and let that stand as a verdict on the *package*, which
{% ref "SPEC-153" /%} D1 had already separated by making a plugin-shipped composition
byte-identical to a user-authored one. Two things the cost argument missed: a package of
compositions is nearly free — no transform, and no CSS at all, since a composed rune has no
block — and `event`'s schema row (Event with a nested `Place`, `startDate` / `endDate` /
`url`) is **curated knowledge nothing validates**, which is ADR-039 rule 3's third criterion
and reason enough to keep distributing it. `itinerary` emits no schema and is not covered by
that; `map` still relocates, as stated. The code findings in this spec are unaffected.

### D3 — `map` is out of scope for composition permanently

Not "blocked pending a mechanism". It needs a component lifecycle, which is
{% ref "ADR-036" /%}'s plugin escape hatch by design. Recording it as permanent stops it
being re-examined each time the composition vocabulary grows.

### D4 — `event` is the reference fixture for SPEC-146's Problem 2

It exercises paths A, B and D in one table, with a measured before/after. Any change to
name resolution should be checked against it, because it fails in the most misleading
possible way: the complex-looking nested entity survives and the two obvious properties
vanish.

## Implementation notes, deliberately not yet work items

Kept here rather than filed, so the adopting milestone decides its own breakdown.

1. **Compose `itinerary`, `itinerary-day`, `itinerary-stop`** — unblocked today; the
   earliest available proof that composition replaces a real plugin rune.
2. **Compose `event`** — after SPEC-146, with paths B and C verified against the
   measured baseline above.
3. **Relocate `map`** to core beside `diagram` / `nav` / `sandbox`, reusing SPEC-147's
   `segmented` content model for its heading grouping.
4. **Resolve `ItineraryStop`'s `requiresParent`** — it names `Itinerary` (one of
   SPEC-145 D12's thirteen), so a composed day must place the nodes `emitTag` produced
   rather than writing `{% itinerary-stop %}` directly, or the requirement must recognise
   the composed parent. The examples assume the former; it needs deciding either way.

## Non-goals

- Deleting `plugins/places/` — same staging as SPEC-147 D1
- Composing `map`, now or later (D3)
- Resolving WORK-567's open per-child typing for itinerary — composition makes it
  possible, this spec does not require it
- Auditing the remaining plugins; the method here is reusable, the results are not

## Acceptance Criteria

- [ ] `itinerary`, `itinerary-day` and `itinerary-stop` exist as compositions with fixtures, rendering with no schema output, matching the plugin's recorded baseline
- [ ] `event` exists as a composition, and its `name` and `description` publish — the measured regression above is closed, asserted against the graph and not the attributes
- [ ] Every property in this spec's tables is asserted at its stated path, so a path change is caught rather than inferred
- [ ] `map` renders from core with its existing fixture unchanged, and its heading grouping uses the shared `segmented` model
- [ ] `plugins/places/` is unchanged and passing its own tests until an explicit removal decision (D2)
- [ ] The `requiresParent` question in note 4 is resolved and the resolution recorded
- [ ] SPEC-145 records the delimiter constraint, with the `card` case as its worked example
- [ ] Lumina's 183 lines of `event` + `itinerary` CSS are re-keyed via `contextModifiers`; `map`'s 121 travel with it

## References

- {% ref "SPEC-147" /%} — the storytelling audit; the first data point for the cross-audit finding
- {% ref "SPEC-145" /%} — composed runes; the mechanism audited, and where the delimiter constraint belongs
- {% ref "SPEC-146" /%} — name resolution across boundaries; what gates `event`
- {% ref "ADR-036" /%} — the plugin escape hatch `map` falls under, and the pattern-grammar exception `headingExtract` uses
- {% ref "SPEC-130" /%} — the schema table and its applier; the five paths
- {% ref "WORK-567" /%} — why `itinerary` and `map` emit nothing today
- {% ref "SPEC-149" /%} — the business audit; splits this spec's path B into B-intrinsic and B-by-choice, and supplies the negative case for the misfiled-capability pattern
- {% ref "SPEC-150" /%} — the design audit; establishes that this method has a precondition, and that the answer is sometimes no
- {% ref "SPEC-151" /%} — the marketing audit; quantifies what `event`'s failure costs across the corpus
- {% ref "SPEC-152" /%} — the plan audit; the sixth application of this method, and the first whose outcome is neither retire nor dissolve
- {% ref "SPEC-154" /%} — the learning audit; the seventh, and where the delimiter rule and D3's permanence precedent are both reused
- {% ref "ADR-039" /%} — where a rune lives; supersedes D2's dissolution in favour of a pack
- {% ref "SPEC-155" /%} — the media audit; the second dissolution, and where D3's Svelte-registry citation is corrected

{% /spec %}
