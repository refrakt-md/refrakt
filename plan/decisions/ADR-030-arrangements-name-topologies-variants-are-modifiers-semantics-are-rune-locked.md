{% decision id="ADR-030" status="proposed" date="2026-09-19" source="SPEC-080" tags="theme, layout, arrangements, vocabulary, architecture, governance" %}

# Arrangements name topologies; variants are modifiers; semantics are rune-locked

## Context

Three mechanisms decide how a rune's children are placed, and each can only be
pointed at one narrow kind of content:

| Mechanism | Decides | Coupled to |
|---|---|---|
| `layout` tree ({% ref "SPEC-081" /%}) | nesting and order of named slots | nothing — this part generalises |
| `blocks[].layout` ({% ref "SPEC-080" /%}) | geometry: `'bar' \| 'definition-list'` | fields projected from `metaFields` |
| `data-sequence` (dimension) | geometry of ordered items | `<ol>` elements and their `> li` children |

`layout` says where things nest. The other two say what *shape* a group takes,
but neither can be applied to arbitrary content: a rune cannot declare "arrange
my child runes as a grid" or "arrange this content region in columns". That is
why `bento`, `gallery`, `grid`, `palette` and `swatch` each carry their own grid
CSS — not because a grid primitive is inexpressible, but because there is
nowhere to declare one.

{% ref "ADR-018" /%} governs the **author-facing** `layout` attribute — the values
an author writes in markdown. Nothing governs the **theme-facing** assembly
vocabulary. This decision is its sibling.

### The question that forced it

If the vocabulary grows, at what granularity does it cut? Concretely: if
"connected dots" (today's `sequence: 'connected'`, used by `timeline` and
`itinerary`) became its own named arrangement, a theme could give a playlist the
timeline treatment.

That must not be allowed, and the reason generalises. `timeline.ts:44` emits
`new Tag('time', {}, [attrs.date])` — **each timeline entry carries its own
positional label**. There is no "event 4"; the marker is a dot precisely because
a numeral would be false information. On a playlist the number *is* the track
number, an identifier a listener says out loud. Restyling a playlist as a
timeline does not change how it looks. It deletes the track numbers.

So `numbered` vs `connected` is not an appearance cut. It encodes **"is the
ordinal itself information?"** — a fact about the content, not about the theme.

## Decision

Five rules governing how the arrangement vocabulary may grow. They govern a
vocabulary that does not exist yet; that is deliberate, and the last rule says
why.

### 1. Topologies get names

An arrangement names a *topology* — the shape of the relationship between a
container and its children. `stack`, `row`, `grid`, `split`, `ladder`, `tree`,
`rail`, `track` are topologies. `timeline`, `steps`, `playlist` are not; they
are runes that use one.

### 2. Variants are modifiers, not names

Direction, marker, connector, wrap and density are modifiers on a topology.
Promoting a *combination* to a name produces a combinatorial explosion: naming
`timeline` immediately owes `timeline-horizontal`, `timeline-grouped`,
`numbered-horizontal`, `numbered-grouped`.

### 3. Semantic modifiers are rune-locked; cosmetic ones are theme-free

`marker: ordinal | positional | none` is rune-owned and immutable — it states
whether the index is data. The marker's *chrome* (circle, square, bare numeral,
colour, weight), the connector's rendering, spacing, and responsive direction
collapse are entirely the theme's.

This is {% ref "ADR-028" /%}'s principle one level down: a theme may not redefine
what a section is, and it may not redefine whether an index is information.

### 4. Arrangements nest

A container's topology and its items' internal layout are independent. A
playlist is a *ladder of rows*; a steps list is a *ladder of stacks*. This is
the capability whose absence currently forces bespoke CSS: after
{% ref "BUG-022" /%} removes `track`'s duplicated counter, the remaining
`display: flex` / `flex: 1` / ellipsis in `skeleton/styles/runes/track.css` is
the track's *inner* arrangement, which no mechanism can declare.

### 5. A topology needs three existing implementations before promotion

A primitive is derived from repetition already in the codebase, never proposed
speculatively. Two consumers is a coincidence; three is a pattern. A generic
primitive that is 80% right for its consumers is worse than the bespoke CSS it
replaced, because the 20% is fought silently in every consumer and the cost is
invisible until the fourth one.

## Rationale

The promotion rule is the load-bearing one, and it is already earning its keep
by disqualifying most of what a vocabulary would naively contain:

| Candidate | Existing consumers | Verdict |
|---|---|---|
| `row`, `pairs` | shipped as `bar` / `definition-list` | rename only |
| `ladder` | howto, recipe, steps, track, timeline, itinerary | qualifies — but it already exists as `data-sequence`, so this is consolidation, not new capability |
| `grid` | bento, gallery, grid, palette, swatch | **qualifies, and genuinely new** |
| `rail` | progress | 1 — wait |
| `track`, `split`, `radial` | 1 each | wait |

So **`grid` is the only arrangement that adds capability today.** Everything
else is renaming and unification. That is a smaller result than the idea
promises, and stating it here is the point: without rule 5 the same analysis
would have produced eight primitives, five of them guesses.

`rail` is the instructive near-miss. It looked like it had two consumers —
`progress` and `budget` — until `budget` was read: `skeleton/styles/runes/budget.css`
is entirely `justify-content: space-between` rows, with no proportional bars
anywhere. It is a stack of rows, built from the two primitives that already
ship. A vocabulary designed from the plausible-sounding list rather than the
code would have shipped `rail` with one real consumer.

## Consequences

**The first shipment is small and mostly a rename.** `data-zone-layout` and
`data-sequence` become values of one `data-arrange` vocabulary; `grid` is added.
Theme authors learn one vocabulary with uniform applicability instead of three
with different coupling rules — which is the real win, and it is a coherence win
rather than a capability one.

**`radial` is not a topology.** Under rules 1 and 2 a cycle is a *ladder whose
ends join*: `stack` mode is a vertical ladder, `strip` is horizontal + wrap,
`wheel` is radial + wrap, `grid` is a grid. `radial` is a direction value
alongside vertical and horizontal, and `wrap` is the one genuinely new modifier
— it is what distinguishes a cycle from a list.

**Nesting needs no new machinery.** Rule 4 is what makes a theme able to change
a playlist from rows to cards. {% ref "WORK-584" /%} Q1 established that the
engine already supports it: every `data-rune` node gets its own assembly pass from
its own config, so a container's topology and its items' inner layout are
declared independently as a matter of course. An arrangement vocabulary inherits
this rather than having to build it.

**Semantic locking needs somewhere to live.** Rule 3 requires the engine to
distinguish rune-owned from theme-owned modifiers on the same arrangement.
{% ref "ADR-029" /%} draws the equivalent line for containers (`data-section`
versus `data-group`); modifiers need the same treatment, and the two should use
one mechanism.

**This decision does not authorise building anything.** It constrains a later
spec. If that spec never comes, nothing is owed.

## Alternatives considered

**Name arrangements after their appearance** — `timeline`, `steps`, `carousel`.
Reads well and matches how people talk. Rejected: it makes presentation and
semantics indistinguishable, so a theme swapping `numbered` for `timeline` looks
like a style change and is data loss. It also multiplies names per variant
combination.

**Let themes choose any arrangement freely, with no locked modifiers.** Maximum
theme expression. Rejected on the playlist case — the track number is content,
and a vocabulary that lets a theme delete content is not a styling vocabulary.

**Freeze at `bar` and `definition-list`; keep everything else bespoke.** No new
surface, no governance needed. Rejected: it accepts that every rune with novel
geometry pays full CSS cost forever, and leaves the `blocks`/`metaFields`
coupling — which is the thing actually blocking grid declarations — unaddressed.

**Define the full vocabulary now and let consumers catch up.** Faster to a
coherent-looking system. Rejected by rule 5, and by the `rail`/`budget`
near-miss that produced it.

## References

- {% ref "SPEC-080" /%} — the `metaFields` / `blocks` / `layout` assembly model this governs
- {% ref "SPEC-081" /%} — declarative structure assembly
- {% ref "ADR-018" /%} — canonical layout vocabulary; the author-facing sibling
- {% ref "ADR-028" /%} — attribute applicability is rune identity; the source of the semantic-locking principle
- {% ref "ADR-029" /%} — structural assembly is theme-owned; draws the container half of the same line
- {% ref "BUG-022" /%} — the sequence duplication that exposed the `<ol>`/`<li>` coupling

{% /decision %}
