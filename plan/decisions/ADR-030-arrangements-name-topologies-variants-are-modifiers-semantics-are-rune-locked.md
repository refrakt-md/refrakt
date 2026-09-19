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

Six rules governing how the arrangement vocabulary may grow. They govern a
vocabulary that does not exist yet; that is deliberate, and rule 5 says
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

### 5. Two bars, by what the addition is for

An earlier draft had one rule — *three existing implementations before
promotion* — which is right for one kind of addition and circular for the other.
Existing implementations only exist for shapes the current vocabulary permitted,
so counting them approves consolidations of what people already hand-rolled and
can never approve anything new. `rail` reads as having one consumer not because
rails are rare, but because nothing could declare one: every would-be rail
became bespoke CSS and does not register as an implementation of anything.

**5a — a consolidating topology needs three existing implementations.** It
replaces bespoke CSS that already exists, so the claim being made is *this
pattern recurs*, and the repetitions are the evidence. Two is a coincidence;
three is a pattern. A generic primitive that is 80% right is worse than the
bespoke CSS it replaced, because the remaining 20% is fought silently in every
consumer and the cost is invisible until the fourth one. Ships stable.

**5b — an enabling topology needs a contract, a case, and a tier.** It offers
what nothing does today, so there is nothing to count. Instead it needs:

- a contract statable **without naming any rune** — if the definition needs an
  example to be intelligible, it is not a topology yet;
- at least one concrete design that wants it, with a sketch of the markup and
  CSS it would produce;
- no overlap with an existing topology (see rule 1 — a variant is not a
  topology);

and it ships **provisional**: recorded in the theme contract as unstable,
excluded from the stability guarantee, and changeable without a migration.

**Promotion from provisional to stable requires a second independent consumer
that adopted it without needing its shape changed.** That is what the old
three-implementation bar was a crude proxy for. The thing a second consumer
teaches is not "people want this" — it is "the contract survived contact with a
use case its author did not have in mind."

### 6. Vocabulary is cheap; mechanism is expensive

Rules 5a and 5b govern *mechanism*. They do not govern *names*.

`sections` has a closed seven-value role vocabulary
(`header | preamble | title | description | body | footer | media`), which is
right because a role changes what the engine does. Presentational **groups**
(rule 2 of {% ref "ADR-029" /%}) have no vocabulary at all: every theme invents
its own wrapper names. A **conventional, open** set of group names — `byline`,
`meta`, `actions`, `aside` — is worth publishing at a much lower bar than a
topology, because a wrong name costs nothing (add another) while a wrong
mechanism costs migrations.

**A group name carries no geometry.** Its shape comes from the arrangement it
declares, exactly as any other container's does — so a `byline` is a group
*named* byline that *arranges* as a row, and skeleton styles the arrangement,
never the name. This is what keeps the vocabulary free: nothing is stamped on a
node for being called something, so a rune part that happens to share a
conventional name inherits nothing and needs no reserved-name rule to protect
it. Opt-in is by declaring an arrangement, not by choosing a label.

**The capability is already there, under the pre-rename spelling.** A `layout`
entry's `attrs` are spread onto the wrapper the engine creates
(`placeNames`, `engine.ts`), and `skeleton/styles/dimensions/metadata.css`
already styles `[data-zone-layout="bar"]` generically — `display: flex`,
`flex-wrap: wrap`, `align-items: center`, plus `data-wrap` and `data-align`
modifiers. So this works today, in any theme, with no new code:

```ts
byline: {
  tag: 'div',
  attrs: { 'data-zone-layout': 'bar' },
  children: ['track-artist', 'track-duration'],
}
```

Pinned by case B2 in `packages/transform/test/child-rune-layout.test.ts`. What
the rename buys is type safety rather than capability: stamping the attribute
through `attrs` is a stringly-typed back door that nothing validates, where a
first-class `arrange` key on `LayoutEntry` would be checked against the
vocabulary.

Rule 6 also closes a concrete gap. A **plugin shipping CSS for its own runes
cannot target a group a theme invented.** Without a conventional vocabulary,
plugin CSS and theme structure cannot meet.

## Rationale

Rule 5 is the load-bearing one, and splitting it changes the answer materially:

| Candidate | Existing consumers | Bar | Verdict |
|---|---|---|---|
| `row`, `pairs` | shipped as `bar` / `definition-list` | — | rename only |
| `ladder` | howto, recipe, steps, track, timeline, itinerary | 5a | consolidation — it already exists as `data-sequence` |
| `grid` | bento, gallery, grid, palette, swatch | 5a | **stable, and genuinely new capability** |
| `split` | compare, comparison | 5a | 2 — wait for a third |
| `rail` | progress | 5b | **provisional** — contract is statable, `tolerance` is the case |
| `track` | — | 5b | **provisional** — `mix` is the case |
| `radial` | — | — | not a topology; a `ladder` direction (rule 2) |

Under the single old bar, everything below `grid` was blocked and the honest
summary was *"`grid` is the only arrangement that adds capability."* That result
was an artefact of the rule, not of the domain: it measured what the existing
vocabulary had permitted people to build by hand.

Under 5a/5b the vocabulary can grow where a contract is genuinely clear, without
freezing guesses into a public surface — the provisional tier absorbs the
uncertainty that the old rule handled by refusing outright.

**Rules 5a and 5b fail in opposite directions, which is why both are needed.**
5a's failure mode is the near-miss: `rail` looked like it had two consumers —
`progress` and `budget` — until `budget` was read. `skeleton/styles/runes/budget.css`
is entirely `justify-content: space-between` rows with no proportional bars
anywhere; it is a stack of rows built from the two primitives that already ship.
Counting plausible-sounding consumers rather than reading code would have
shipped `rail` as stable on false evidence. 5b's failure mode is the opposite —
a well-argued contract with no real use — which is why it ships provisional and
why promotion requires a consumer the author did not anticipate.

## Consequences

**The first shipment is a rename plus one stable and two provisional additions.**
`data-zone-layout` and `data-sequence` become values of one `data-arrange`
vocabulary; `grid` lands stable; `rail` and `track` land provisional. Theme
authors learn one vocabulary with uniform applicability instead of three with
different coupling rules.

**The provisional tier needs teeth or it is a comment nobody reads.** If nothing
marks a provisional arrangement as unstable, it becomes stable by adoption and
the tier has achieved nothing. Minimally: the theme contract records each
arrangement's tier, and a theme using a provisional one is told so at build
time. Without that, 5b is strictly worse than the old rule, because it ships
guesses with the appearance of a guarantee.

**Provisional is not a parking space.** An arrangement that sits provisional
across several releases with no second consumer is evidence the contract was
wrong or the need imagined, and should be removed rather than left to accrete
users. Removal is the tier's whole point and has to actually happen.

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
{% ref "ADR-029" /%} draws the equivalent line for containers — a semantic
container carries `data-section`, a presentational group does not, and
`sections` is identity-guarded so a theme cannot cross it. Modifiers need the
same treatment, and the two should use one mechanism.

**A group-name vocabulary is separable and costs almost nothing.** Rule 6 is a
documentation page and an agreed list — no engine change and no CSS. Themes can
already create named groups through `layout` ({% ref "WORK-584" /%} Q1) and
already give them shared geometry by declaring a zone layout, which skeleton
already styles. It can ship before any arrangement work and is the one part of
this decision with an immediate audience, plugin authors included: they have no
group name they can rely on today when shipping CSS for their own runes.

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
coherent-looking system. Rejected by rule 5a, and by the `rail`/`budget`
near-miss that produced it — a vocabulary assembled from plausible-sounding
names rather than read code ships primitives on false evidence.

**One bar for everything: three existing implementations, no exceptions.** This
was the first draft, and it is simpler to state and to enforce. Rejected as
circular: existing implementations only exist for shapes the vocabulary already
permitted, so the rule can approve consolidations and nothing else. It would
also have blocked `rail` indefinitely on the grounds that nothing declares a
rail today — which is true, and is the problem rather than the answer.

**Ship enabling topologies stable, and accept the compatibility risk.** Serves
theme authors immediately with no tier machinery. Rejected because the cost of a
wrong arrangement is not the code but the migration: once themes depend on a
contract it cannot be changed quietly. The provisional tier gets the same
availability at a fraction of the risk, and the only thing it asks for is
honesty about which parts are settled.

## References

- {% ref "SPEC-080" /%} — the `metaFields` / `blocks` / `layout` assembly model this governs
- {% ref "SPEC-081" /%} — declarative structure assembly
- {% ref "ADR-018" /%} — canonical layout vocabulary; the author-facing sibling
- {% ref "ADR-028" /%} — attribute applicability is rune identity; the source of the semantic-locking principle
- {% ref "ADR-029" /%} — structural assembly is theme-owned; draws the container half of the same line
- {% ref "BUG-022" /%} — the sequence duplication that exposed the `<ol>`/`<li>` coupling

{% /decision %}
