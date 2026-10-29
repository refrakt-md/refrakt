{% spec id="SPEC-156" status="draft" tags="runes, theme, layout, arrangements, composition, vocabulary, sequence" %}

# The ladder and row arrangement primitives

## Summary

{% ref "ADR-030" /%} governs how an arrangement vocabulary may grow and closes by saying
*"this decision does not authorise building anything. It constrains a later spec."* This is
that spec, scoped deliberately narrow: **two topologies, `ladder` and `row`**, because those
are the two the evidence supports and the two {% ref "SPEC-145" /%}'s composed runes need
first.

**Revised on 2026-10-27** against the code after v0.42.0. The first draft found both
topologies hand-written and missing generically. Re-read, **both already exist generically**:
the row as `[data-zone-layout="bar"]`, and the ladder as the `sequence` dimension
(`[data-sequence]`). What is missing is **aperture**: a composition template cannot reach
either. So the deliverable shrinks to one template tag, `{% group %}`, with two arrangement
values. The two identity holes the first draft found were closed by {% ref "SPEC-158" /%}
in v0.40.0.

**Renamed on 2026-10-29** ({% ref "SPEC-181" /%}): the ladder is {% ref "ADR-018" /%}'s canonical
`list`, so templates write `{% group layout="list" %}` and it emits `data-layout="list"` with an
items track, not `data-zone-layout="ladder"`. `ladder` stays {% ref "ADR-030" /%}'s name for the
topology. SPEC-181 also owns the list contract D3 describes; the decisions here otherwise stand.

Decision numbers are kept from the first draft, because other specs cite them. D2, D3 and D8
are revised in place; D4 and D5 are recorded as shipped; D10 was settled in the ADR-030 review;
D12–D14 are new.

## The row exists, once generically

**Generic**, `packages/skeleton/styles/dimensions/metadata.css`:

```css
[data-zone-layout="bar"]                    { display: flex; flex-wrap: wrap; align-items: center; }
[data-zone-layout="bar"][data-wrap="false"] { flex-wrap: nowrap; }
[data-zone-layout="bar"] [data-align="end"] { margin-left: auto; }
```

`symbol`, `bar` and `api` key on it. **Rune-specific copies** live in
`packages/skeleton/styles/runes/track.css` and `playlist.css`: the same flex, the same marker
box, the same `flex: 1; min-width: 0` name cell, and `margin-left: auto` on the duration, which
*is* the bar's right-push. A track row is a bar, confirmed in CSS rather than by analogy.

Today a bar is reachable from the `bar` rune, or from `blocks[].layout` over
`metaFields`-projected fields. It is not reachable over ordinary named slots, which is what a
composition template has.

## The ladder exists too: it is the `sequence` dimension

The first draft said the ladder container "exists five times, and generically nowhere." That
was wrong. The generic container is the `sequence` dimension:

- **Values:** `numbered`, `connected` and `plain` (`RuneConfig.sequence`,
  `packages/transform/src/types.ts`).
- **Structure**, `packages/skeleton/styles/dimensions/sequence.css`: the list reset, the
  counter origin, the item gutter and the marker box for `numbered`; the item geometry and
  marker box for `connected`; the reset alone for `plain`. **Look**,
  `packages/lumina/styles/dimensions/sequence.css`: marker fill, connector lines, type.
- **Stamping:** the engine's `annotateSequence` (`packages/transform/src/engine.ts`) sets
  `data-sequence` on every `<ol>` inside a rune whose config declares `sequence`. Seven runes do:
  `howto`, `recipe`, `steps`, `playlist` (`numbered`), `timeline`, `itinerary` (`connected`),
  and `plot` through a modifier.

**What the per-rune CSS is.** Seven skeleton files reset a list for their items: `playlist`,
`steps`, `timeline`, `itinerary`, `howto`, `recipe` and `cast`. Four of them also hand-roll a
counter that the dimension already provides, which {% ref "BUG-024" /%} records: the two land at
different specificities, so which one wins differs per rune. That is duplication of a generic
contract, not the absence of one.

**`cast` is a weaker case than the first draft said.** It was called the strongest single piece
of evidence, a ladder no config knows about. Its container has three arrangements, `grid`,
`list` and `carousel` (`packages/skeleton/styles/runes/cast.css`). Only `list` is a ladder.

So the one genuinely missing generic part is small: **a ladder with no sequence**, a list of peer
items in a column with the marker reset and nothing else. `plain` is close, but it is stamped
only through a rune's `sequence` config.

## What a composition cannot do

A composed `steps` needs an `<ol>` of its steps, stamped `data-sequence="numbered"`. It has no
way to get one:

- **No `sequence`.** `composedRuneConfig` generates `modifiers`, `metaFields`, `blocks` and
  `provides` ({% ref "SPEC-169" /%}, What the parser accepts). {% ref "SPEC-169" /%} D6 routes
  `sequence` to this spec.
- **No list around an `each` slot.** A template writes Markdoc. It cannot wrap the items an
  `each` slot produces in an `<ol>` with one `<li>` per item.
- **No row over slots.** A template that wants bar geometry must place the `bar` rune, which
  carries `data-rune="bar"`, a name-resolution boundary ({% ref "SPEC-145" /%} D19).

SPEC-169 D4's own `steps` example already writes the answer:

```md
{% group name="steps" layout="list" %}
{% slot name="items" each %}
{% section %}{% slot /%}{% /section %}
{% /slot %}
{% /group %}
```

## Variants of an item's arrangement

The worked case: display a track as a name with a byline underneath rather than as one row.

```
row form:     [1] Speak to Me · Pink Floyd ————————→ 1:13 · Mar 1973
byline form:  [1] Speak to Me
                  Pink Floyd · 1973 · 1:13
```

The parts are identical. The item's topology goes row → column, and three sibling parts are
grouped. That is rule 4 nesting, not a new topology, and `byline` is one of the group names
rule 6 names (`byline`, `meta`, `actions`, `aside`).

On the declared path, `blocks` already does it: a `BlockDef` is a named group of meta-fields
with a layout, and `{ field: 'duration', align: 'end' }` emits `data-align="end"`, which is the
right-push `track.css` hand-writes. **Measured on 2026-10-27:** `Track`'s config is still
`{ block, parent, defaultElevation, editHints }`, with no `metaFields` and no `blocks`. Its
artist, duration and date are hand-built spans.

Selection follows who wants the change:

| Wants it | Mechanism | Status |
|---|---|---|
| The **theme** | `variants` over `layout` ({% ref "SPEC-091" /%}) | ships |
| The **composition author** | {% ref "SPEC-145" /%} D15, several templates | decided, not built |
| The **page author**, per instance | a parent attribute reaching its items | D8 |

## The grouping-device hazard

An engine-made group (a `blocks` zone, a created `layout` wrapper, or the `{% group %}` of D2)
carries `data-name` and no `data-rune`. A group made by **placing a rune**, `{% bar %}…{% /bar %}`,
carries `data-rune="bar"`, which is a name-resolution boundary: `findAllByName` stops at it, so a
schema property sourced from a node inside that group disappears with no diagnostic
({% ref "SPEC-146" /%} Problem 2). `track` survives by luck: every property in `trackSchema` is
attribute-sourced. SPEC-145 D19 states the rule for templates; D9 here records it.

## Decisions

### D1 — scope is `ladder` and `row`, and both are consolidations

{% ref "ADR-030" /%} rule 5a, not 5b. Both topologies have generic implementations already and
several hand-written copies. No other topology is in scope: `grid` and `split` are plausible
consolidations with their own evidence and their own spec.

### D2 — a template reaches both through `{% group %}`, an engine wrapper with an arrangement

*Revised 2026-10-27.* The first draft said the row needed aperture and the ladder needed a new
contract. Both need the same thing: a way for a template to declare an arrangement on an
engine-made group. That is ADR-030 rule 6's form, made a template tag:

```md
{% group name="byline" layout="bar" %}…{% /group %}
{% group name="steps" layout="list" %}…{% /group %}
```

1. **It is an engine wrapper.** It renders with `data-name` and no `data-rune`, so it is safe
   where the rune publishes schema (D9, SPEC-145 D19). A composed rune has no block
   (SPEC-145 D2), so a group gets no BEM class: themes see its `data-name` and
   `data-zone-layout` (`bar`) or `data-layout` (`list`, and SPEC-181's `grid` and `carousel`).
2. **`name` is required**, and a convention, not a type: it carries no geometry (D6).
3. **`layout` takes `bar` or `list`** (renamed from `ladder`; {% ref "SPEC-181" /%} D4 adds
   `grid` and `carousel`). Nothing else, until a topology clears ADR-030 rule 5a
   in its own spec. An unknown value is rejected at schema construction, naming it.
4. **`bar`** renders a `<div data-zone-layout="bar">` over whatever the group holds, the
   existing row contract. A child that should push to the end is written in its own
   `{% group name="…" align="end" %}`, which renders `data-align="end"`.
5. **`list`** renders a list (D3).
6. **It is a template tag only.** Authors do not write `{% group %}` on a page; the `bar` rune
   remains the author-facing row ({% ref "SPEC-145" /%} D12's placement set is unchanged).

### D3 — the ladder is the `sequence` dimension, plus a reset for the unsequenced case

*Revised 2026-10-27.* The contract, stated without naming a rune: *a list whose direct children
are peer items, each free to declare its own inner arrangement, with a shared marker gutter when
the rune declares a sequence.*

1. **Element.** `<ol>` when the definition declares a `sequence` (D12), `<ul>` otherwise, with
   `data-name` and `data-zone-layout="ladder"`. *Renamed 2026-10-29:* a host `data-layout="list"`
   holding the `<ol>` or `<ul>` as its `data-name="items"` track ({% ref "SPEC-181" /%} D3).
2. **Items.** Each iteration of an `each` slot placed directly in the group, or else each
   top-level node the group holds, is wrapped in an `<li>`.
3. **Markers** are the `sequence` dimension's: the ladder carries `data-sequence` with the
   definition's value. No second marker contract is written.
4. **The unsequenced ladder** gets the one missing rule (*renamed 2026-10-29:* SPEC-181 D3's
   `[data-layout="list"] [data-name="items"]`): `[data-zone-layout="ladder"]` resets the
   list and flows its items in a column, about six declarations in skeleton. `cast`'s `list`
   mode is its first native consumer.
5. "Optional separation between items" stays one hook, not modifiers. If it becomes three
   modifiers, the topology is really two and this decision is wrong.

### D4 — `sequence` is identity: shipped

Closed by {% ref "SPEC-158" /%} D2 in v0.40.0: `sequence` is in `IDENTITY_FIELDS`
(`packages/transform/src/identity-fields.ts`), and `sequenceDirection` stays presentational.

### D5 — `layout.attrs` cannot write an identity attribute: shipped

Closed by {% ref "SPEC-158" /%} in v0.40.0: a layout `attrs` entry that writes an attribute an
identity field derives is rejected (`identity-fields.ts`, cited there as SPEC-156 D5).

### D6 — a group's geometry comes from its declared arrangement, never from its name

ADR-030 rule 6, made operative by D2: `byline` is a group *named* byline that *arranges* as a
row. Nothing is stamped on a node for being called something, so no reserved-name rule is
needed.

### D7 — the byline variant needs no new mechanism, only adoption

`metaFields`, `blocks`, two `layout` values and a `variants` axis all ship. It is blocked only
by `Track` not declaring its meta fields, which is still true on 2026-10-27.

### D8 — the per-instance cascade is narrowed to author-written children

*Revised 2026-10-27, as {% ref "SPEC-171" /%} D4 asked.* Three cases were found: `bento`'s
`media-position`, `playlist`'s default `artist` (`track.artist ?? artistValue`), and
`playlist`'s child kind.

{% ref "SPEC-145" /%} D32 now covers a parent passing a value to children **the template
places**: the template writes it on them. What D32 cannot reach is children **the author
writes** inside a slot: the tracks in a playlist, the cells in a bento. A template places the
slot, not the runes inside it. All three cases are of that kind, so the `childDefaults`
mechanism is still needed, scoped to author-written children, and remains a separate spec.
{% ref "SPEC-159" /%} keeps the theme-owned half.

### D9 — a composed template groups with an engine wrapper, not a placed rune

Where schema is involved; with no schema table, either device is safe. `{% group %}` (D2) is the
engine wrapper a template writes. SPEC-145 D19 states the same rule.

### D10 — there is no `carousel` / `rail` collision; both stray names are withdrawn

*Revised 2026-10-28.* The first draft said `carousel` and `rail` named one topology. They do
not. ADR-030 never defined `rail`, but its cited cases (`progress`, `tolerance`, and `budget`,
ruled out for having "no proportional bars") point at items placed along a scale by value, not
a scrolling strip. Neither name had a contract, and `track` also collided with the `track` rune.

Settled in the ADR-030 review: `rail` and `track` leave its topology list until a spec proposes
them with a contract. `carousel` stays {% ref "ADR-018" /%}'s author-facing layout with
{% ref "SPEC-100" /%}'s contract, and is not a value of `{% group layout %}` until a spec places
it there.

### D11 — `stack` is not named

It is default block flow. Naming the null case invites `stack-tight` and `stack-loose`, which
is rule 2's combinatorial explosion arriving by the back door. {% ref "SPEC-161" /%} D6's block
layout is therefore named `lead`, after the one thing that distinguishes it.

### D12 — a composition declares `sequence` in its definition, not its template

A composed rune's frontmatter takes `sequence` (`numbered | connected | plain`), and the
generated config carries it.

- **Why the frontmatter.** `sequence` is identity: whether an ordinal is information is a fact
  about the content (SPEC-158 D2, ADR-030 rule 3). {% ref "ADR-045" /%} and
  {% ref "SPEC-177" /%} let a theme or site replace a composition's template while keeping its
  frontmatter. A `sequence` written in the template would travel with the template, so a
  theme's replacement could delete the step numbers, which is rule 3's founding example.
- **The template marks where.** The `{% group layout="list" %}` is where the definition's
  sequence is stamped.
- **A definition that declares `sequence` must place a ladder**, or it is rejected at schema
  construction, naming the rune. A sequence with nowhere to go is the silent loss this guards
  against.
- **SPEC-177's checks apply the same rule** to a replacement template: one that drops the
  ladder group of a definition declaring a sequence is rejected when the site loads.

### D13 — ordinals arrive as nodes, and the per-rune counters go first

{% ref "WORK-583" /%} (ready, from {% ref "ADR-029" /%}) emits a numbered sequence's ordinal as a
DOM node instead of a CSS counter: information belongs in the document. Composed ladders should
get node ordinals from the start rather than be migrated afterwards, so WORK-583 lands before or
with D2. {% ref "BUG-024" /%}'s removal of the four vestigial per-rune counters is the "proved by
deletion" step this spec asks for, and goes with it.

### D14 — a ladder stamps its own list, not every list inside it

`annotateSequence` recurses through every descendant of a rune declaring `sequence` and stamps
every `<ol>` it finds. For a ladder that would include an ordered list an author wrote inside a
step's body, which would then be numbered as steps. The ladder's `data-sequence` is set on the
ladder element only. Whether native runes already mis-stamp nested author lists is checked
during implementation and filed as a bug if they do.

## Implementation notes, deliberately not yet work items

1. WORK-583 and BUG-024 first (D13).
2. The `{% group %}` template tag with `bar` and `ladder`, and the unsequenced ladder rule (D2,
   D3).
3. `sequence` in the definition's frontmatter, and the ladder requirement (D12).
4. A composed `steps` over it, compared with the plugin ({% ref "SPEC-161" /%} D5).
5. `Track` adopts `metaFields` and `blocks` (D7), deleting `track.css`'s hand-written push.
6. The five hand-written list resets that remain after BUG-024 are re-expressed through the
   ladder or the dimension, with their CSS deleted.

## Non-goals

- `grid`, `split`, `tree` or any topology beyond `ladder` and `row` (D1)
- `childDefaults`, the per-instance cascade for author-written children (D8)
- Promoting `layout` to a universal attribute: every universal today is decoration, so a
  structural one is a category change that needs its own argument
- {% ref "SPEC-145" /%} D15's several templates, which the variants section describes but does
  not specify
- Retiring `bar` as a rune; it stays as the author-facing row
- `{% group %}` as an author-facing rune (D2)

## Acceptance Criteria

- [ ] A composition template can place `{% group name layout="bar" %}` and `{% group name layout="list" %}`; both render with `data-name` and no `data-rune`, and an unknown `layout` is rejected at schema construction (D2)
- [ ] A `bar` group's child written as `{% group align="end" %}` renders `data-align="end"` and pushes to the end (D2)
- [ ] A ladder renders `<ol>` when the definition declares a `sequence` and `<ul>` otherwise, with each `each` iteration or top-level node in an `<li>` (D3)
- [ ] `[data-layout="list"] [data-name="items"]` ({% ref "SPEC-181" /%} D3) resets the list and flows items in a column in skeleton; `cast`'s `list` mode uses it and its own reset is deleted (D3)
- [ ] A composition's frontmatter accepts `sequence`; the generated config carries it, and a definition declaring `sequence` without a ladder group is rejected, naming the rune (D12)
- [ ] The ladder's `data-sequence` is set on the ladder element only; an ordered list in an item's body is not stamped (D14)
- [ ] {% ref "WORK-583" /%} and {% ref "BUG-024" /%} are done before or with the ladder (D13)
- [ ] A composed `steps` places a numbered ladder and matches the plugin's output, every difference explained
- [ ] `Track` declares `metaFields` and `blocks`, its byline variant is a `variants` entry over `layout`, and `track.css`'s hand-written `margin-left: auto` is gone (D7)
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no unexplained drift, on both contract copies
- [ ] The CSS-coverage test's known-gap sets shrink rather than grow
- [ ] The authoring guide documents `{% group %}` and states D9's rule

## References

- {% ref "ADR-030" /%}: the rules this spec is the "later spec" for; accepted on 2026-10-28, with D10 settled there.
- {% ref "SPEC-158" /%}: shipped D4 and D5.
- {% ref "SPEC-169" /%}: D4's `steps` example, and D6, which routes `sequence` here.
- {% ref "SPEC-145" /%}: D19 (grouping), D32 (passing down), D15 (several templates).
- {% ref "SPEC-177" /%} and {% ref "ADR-045" /%}: template replacement, which D12 guards against.
- {% ref "WORK-583" /%}, {% ref "ADR-029" /%}: ordinals as nodes.
- {% ref "BUG-024" /%}: the vestigial per-rune counters.
- {% ref "SPEC-161" /%}: D5 (`steps`), D6 (`lead`).
- {% ref "SPEC-080" /%}: `metaFields`, `blocks`, `LayoutPrimitive`.
- {% ref "SPEC-091" /%}: `variants`.
- {% ref "SPEC-146" /%}: the boundary that makes D9's hazard silent.
- {% ref "SPEC-155" /%}: the media audit, and the two rune-specific row implementations.
- {% ref "SPEC-159" /%}, {% ref "SPEC-171" /%}: the cascade, D8.
- {% ref "SPEC-100" /%}, {% ref "ADR-018" /%}: `carousel`, which D10 keeps out of this vocabulary.

{% /spec %}
