{% spec id="SPEC-156" status="draft" tags="runes, theme, layout, arrangements, composition, vocabulary" %}

# The ladder and row arrangement primitives

## Summary

{% ref "ADR-030" /%} governs how an arrangement vocabulary may grow and closes by saying
*"this decision does not authorise building anything. It constrains a later spec."* This is
that spec, scoped deliberately narrow: **two topologies, `ladder` and `row`**, because those
are the two the evidence already supports and the two {% ref "SPEC-145" /%}'s composed runes
need first.

The finding that sets the scope: **both are already implemented, repeatedly, by hand.** One
of them is already generic and merely out of reach; the other is written out five times. So
this is rule 5a work — consolidating what exists — not rule 5b speculation, and the bar is
met with room to spare.

It also answers two questions composition raised and neither {% ref "ADR-030" /%} nor
{% ref "SPEC-145" /%} settles: where a *variant* of an item's arrangement comes from, and
which grouping device is safe to use when a rune publishes structured data.

## The row already exists three times, once generically

**Generic**, `packages/skeleton/styles/dimensions/metadata.css:17-26`:

```css
[data-zone-layout="bar"]                    { display: flex; flex-wrap: wrap; align-items: center; }
[data-zone-layout="bar"][data-wrap="false"] { flex-wrap: nowrap; }
[data-zone-layout="bar"] [data-align="end"] { margin-left: auto; }
```

**Rune-specific**, `packages/skeleton/styles/runes/track.css` (55 lines), whose own header
says it holds *"the row flex + counter, the number box, the cell flex sizing + ellipsis
overflow + duration auto-push"*:

```css
.rf-track                    { display: flex; align-items: center; counter-increment: track; }
.rf-track::before            { content: counter(track); min-width: 1.5rem; flex-shrink: 0; }
.rf-track__track-name        { flex: 1; min-width: 0; overflow: hidden; }
.rf-track__track-duration    { flex-shrink: 0; margin-left: auto; min-width: 3rem; }
.rf-track__track-description { flex-basis: 100%; }
.rf-track:has(.rf-track__track-description) { flex-wrap: wrap; }
```

**And again**, `packages/skeleton/styles/runes/playlist.css` (61 lines), on
`.rf-playlist__tracks > li` — the same flex, the same `::before` marker box with
`min-width: 1.5rem; flex-shrink: 0`, the same `flex: 1; min-width: 0; overflow: hidden` on
the name cell. Twice rune-specifically because the markup has two forms
({% ref "SPEC-155" /%} D3).

`margin-left: auto` *is* the bar's right-push. **A track row is a bar, confirmed in CSS
rather than by analogy** — which is what {% ref "ADR-030" /%} rule 4 was pointing at when it
named this exact file as *"the track's inner arrangement, which no mechanism can declare."*

## The ladder container exists five times, and generically nowhere

The between-item treatment — list-marker reset, counter origin, clipping, column flow — is
hand-written in `packages/skeleton/styles/runes/` for **`playlist`, `steps`, `timeline`,
`itinerary` and `cast`**, each with its own `list-style: none` and its own
`counter-reset` / column flex. Nothing generic exists.

So on {% ref "ADR-030" /%} rule 5a's bar — *"a consolidating topology needs three existing
implementations… Two is a coincidence; three is a pattern"* — `row` has three and `ladder`
has five.

## What is actually missing

| Part | Status | Contract |
|---|---|---|
| **Row** (the item) | **exists** — `[data-zone-layout="bar"]` + the `bar` rune | flex row; `data-wrap`; child `data-align="end"` |
| **Ladder** (the container) | **missing** | marker reset, counter origin, clip, column flow, item separation hook |
| **Marker gutter** | exists as `data-sequence`, hand-written per rune | `::before` box with `min-width` + `flex-shrink: 0` |
| **Overflow line** | hand-written, not generic | a named part at `flex-basis: 100%`, container wraps |

Four parts, one genuinely absent, and it is about six declarations. Everything else is
**aperture**: today a bar is reachable only from the `bar` rune or from `blocks[].layout`
over `metaFields`-projected fields, never over ordinary named slots.

## The shape, and what a composed playlist looks like

{% ref "ADR-030" /%} rule 6 already supplies the container's author-facing form — a
conventional, open set of group names carrying no geometry, *"its shape comes from the
arrangement it declares… skeleton styles the arrangement, never the name"*:

```md
{% group name="tracks" layout="ladder" %}
  {% slot name="tracks" /%}
{% /group %}
```

and a composed `track`:

```md
{% bar %}
{% slot name="name" /%} {% slot name="artist" /%}
---
{% slot name="duration" /%} {% slot name="date" /%}
{% /bar %}
```

That is the whole track list, for **one new arrangement value**. Rule 6's own consequence
note says this half is *"separable and costs almost nothing… can ship before any arrangement
work"* and is *"the one part of this decision with an immediate audience, plugin authors
included."*

**Why `emitTag` is a prerequisite rather than a convenience.** A markdown list item cannot
contain a top-level `---`, so an author writing `- **Name** (3:45)` has no way to say
"duration goes to the end" — which is why `playlist` resolves it with `itemModel` regexes and
hand-built spans. Promote the items to `track` runes ({% ref "SPEC-155" /%} D3) and duration
becomes an *attribute*, so the delimiter lives in **track's** template. The promotion is what
makes per-item arrangement expressible at all.

## Variants of an item's arrangement

The worked case: display a track as a name with a byline underneath rather than as one row.

```
row form:     [1] Speak to Me · Pink Floyd ————————→ 1:13 · Mar 1973
byline form:  [1] Speak to Me
                  Pink Floyd · 1973 · 1:13
```

The parts are identical. Two things change: the item's topology goes **row → stack**, and
three sibling parts are **grouped**. That is rule 4 nesting — a stack whose second child is a
row — not a new topology, so the vocabulary stays closed. And `byline` is one of the four
group names rule 6 already names (`byline`, `meta`, `actions`, `aside`).

### It needs no new mechanism on the declared path

Two grouping devices exist, and **they differ in whether the group gets geometry**:

**`blocks` — geometry included.** `BlockDef` is *"a named group of meta-fields rendered by a
layout primitive"*, with per-field `align` and `wrap`:

```ts
metaFields: { artist: {…}, date: {…}, duration: {…} },
blocks:     { byline: { fields: ['artist', 'date', 'duration'], layout: 'bar' } },
layout:     { root: ['track-name', 'byline'] },                          // byline form
//           { root: ['track-name', 'artist', 'duration', 'date'] }      // row form
```

`{ field: 'duration', align: 'end' }` emits `data-align="end"`, which the skeleton turns into
`margin-left: auto` — declaratively, exactly what `track.css` hand-writes.

**Measured**: `Track`'s config is `{ block, parent, defaultElevation, editHints }` — **no
`metaFields`, no `blocks`.** Its artist, duration and date are hand-built spans. Repo-wide
adoption is 20 runes with `blocks`, which is the gap {% ref "SPEC-143" /%} records at 20 of
126. **So the byline variant is available today the moment `Track` adopts the primitive** —
the seventh instance in this series of *the primitive exists, adoption is partial*.

**A created `layout` wrapper — geometry not included.** `LayoutEntry`'s `{ tag, children }`
*"creates a wrapper element (`<tag data-name=key>`) and fills it with the resolved children,
pulled from the flat transform slots"*, which groups ordinary named slots rather than
meta-fields. But the result is a plain `<div>`: **a created wrapper cannot declare an
arrangement**, which is the asymmetry this spec closes.

**Selection** is `variants` ({% ref "SPEC-091" /%}) on the declared path — `recipe`'s
`media-position="cover"` proves a variant delta can restructure `layout` and create
containers — and {% ref "SPEC-145" /%} D15's multi-template on the composed path. Which one
applies follows from who wants the change:

| Wants it | Mechanism | Status |
|---|---|---|
| The **theme** | `variants` over `layout` | ships today |
| The **composition author** | {% ref "SPEC-145" /%} D15 multi-template | proposed |
| The **page author**, per instance | a parent attribute reaching its items | **nothing** — see below |

## The `attrs` back door, measured

`LayoutEntry` carries `attrs?: Record<string, string>`, spread onto the created wrapper at
`packages/transform/src/engine.ts:1532`:

```ts
out.push(makeTag(entry.tag, { 'data-name': name, ...(entry.attrs ?? {}) }, kids));
```

Unconditional, and **unvalidated** — no schema checks `attrs` at config load or at plugin
validation. Probed with a two-slot `Track` and
`attrs: { 'data-zone-layout': 'bar' }`:

```html
<article class="rf-track" data-rune="track" data-density="full">
  <span data-name="track-name" class="rf-track__track-name">Speak to Me</span>
  <div data-name="byline" data-zone-layout="bar" class="rf-track__byline">
    <span data-name="track-artist" class="rf-track__track-artist">Pink Floyd</span>
    <span data-name="track-duration" class="rf-track__track-duration">1:13</span>
  </div>
</article>
```

The attribute lands, and the skeleton rule is a bare attribute selector, so **the wrapper has
bar geometry today**. What it does *not* get is `data-align="end"` on a child:
`LayoutEntry.children` is `string[]` with no per-child attributes, so the right-push stays
unreachable. **Half the capability, by accident.**

That cuts two ways, and both belong in this spec. The arrangement half is the thing to
legitimise — it is this spec's feature arriving early by the wrong route. The rest is a hole:
an unvalidated attribute writer on a **theme-overridable** field can stamp `data-section`, or
`typeof`, onto a node — attributes whose configured sources (`sections`, `schema`) are
identity-guarded precisely so a theme cannot set them ({% ref "ADR-028" /%}). Whether each is
*honoured* downstream was not probed; that the spread cannot refuse them was.

## Two identity-guard holes this work has to close

**1. `sequence` is not identity-guarded.** `RuneConfig.sequence` is
`'numbered' | 'connected' | 'plain'` (`packages/transform/src/types.ts:456`), and
`IDENTITY_FIELDS` is `block, modifiers, sections, mediaSlots, frameTarget,
universalAttributes, provides, schema`. So a theme override can flip a playlist from
`numbered` to `connected` today.

That is {% ref "ADR-030" /%} rule 3's founding example, and the reason it gives: doing so
*"does not change how it looks. It deletes the track numbers."* **Rule 3 is currently
unenforced**, independently of any arrangement work.

**2. `layout.attrs` is an unguarded attribute writer**, per the section above. `layout` is
presentation and correctly theme-overridable; an arbitrary attribute map inside it is a way
around every guard that works by controlling a field's source.

## The grouping-device hazard, which is not obvious

An engine-made group — a `blocks` zone or a created `layout` wrapper — carries `data-name`
and no `data-rune`. A group made by **placing a rune** in a composed template
(`{% bar %}…{% /bar %}`) carries `data-rune="bar"`, which is a **name-resolution boundary**:
`findAllByName` stops at it, so any schema property sourced from a node inside that group
silently disappears ({% ref "SPEC-146" /%} Problem 2).

`track` survives by luck — every property in `trackSchema` is attribute-sourced, so they ride
the field bag. A rune harvesting its meta from content would lose them, with no diagnostic.
**So a composed template groups with an engine wrapper, not with a placed rune, wherever
schema is involved**, and that rule belongs in the authoring guide beside
{% ref "SPEC-148" /%}'s delimiter rule.

## Naming, before either vocabulary ships

**`carousel` and `rail` are one topology under two names.** {% ref "ADR-018" /%} ships
`carousel` as a canonical author-facing token with a real contract
({% ref "SPEC-100" /%}: `[data-layout="carousel"]` + `data-name="items"` + a shared behavior,
three adopters). {% ref "ADR-030" /%} rule 1 lists `rail` as a topology name. Rule 6 says a
wrong *name* costs nothing — but two names for one *mechanism* is a mechanism problem, and
{% ref "ADR-038" /%} makes that contract the model for how any behavior binds.

**`track` is both a topology name in rule 1 and a rune in `@refrakt-md/media`.** Cheap to
rename now.

## Decisions

### D1 — scope is `ladder` and `row`, and both are consolidations

Rule 5a, not 5b: `row` has three implementations and `ladder` five, all measured above. Both
ship **stable**. No other topology is in scope — `grid` and `split` are plausible
consolidations with their own evidence and their own spec.

### D2 — the row is `bar`; what is missing is aperture, not a primitive

`[data-zone-layout="bar"]` already has the geometry and two modifiers. The work is letting a
rune point it at a slot or a list item rather than only at `metaFields`-projected fields.

### D3 — the ladder is the one new contract, and it is stated without naming a rune

*A container whose direct children are peer items, with a shared marker gutter, optional
separation between items, and each item free to declare its own inner arrangement.* That
passes rule 5b's first test. "Optional separation" is the phrase to watch: if it becomes
three modifiers, the topology is really two and this decision is wrong.

### D4 — `marker` is rune-locked, and `sequence` enters `IDENTITY_FIELDS`

Rule 3 says whether an ordinal is information is a fact about content. The enforcement list
does not currently include it, so the rule is unenforced. Closing that is a prerequisite here
and worth doing regardless.

### D5 — `layout.attrs` gains a guard; its arrangement use is legitimised

The arrangement half becomes a first-class declaration (D2). The general capability is
narrowed: an `attrs` map may not set an attribute whose configured source is identity-guarded.
An unvalidated writer on a theme-overridable field defeats guards that work by owning a
field's source.

### D6 — a group's geometry comes from its declared arrangement, never from its name

Rule 6, restated because this spec makes it operative: `byline` is a group *named* byline
that *arranges* as a row. Nothing is stamped on a node for being called something, so a rune
part sharing a conventional name inherits nothing and no reserved-name rule is needed.

### D7 — the byline variant needs no new mechanism, only adoption

`metaFields` + `blocks` + two `layout` values + a `variants` axis, all shipping. It is
blocked only by `Track` not declaring its meta fields. Recorded so the arrangement work is
not credited with capability the repo already has.

### D8 — the per-instance cascade is real, evidenced, and out of scope

{% ref "SPEC-151" /%} left `bento`'s parent→child attribute cascade needing *"its own
justification rather than being invented for one rune."* It now has **three** instances, two
shipped and hand-rolled: `bento`'s `media-position`; `playlist`'s `artist` (*"Default artist
applied to tracks that omit their own"* — `track.artist ?? artistValue`); and `playlist`'s
child kind (`CHILD_KIND[playlistTypeValue]`, passed to `adoptNestedTrack`). That clears rule
5a's bar for a `childDefaults` mechanism, which is a separate spec.

### D9 — a composed template groups with an engine wrapper, not a placed rune

Where schema is involved. The hazard section says why; the exception is a rune with no
schema table, where either device is safe.

### D10 — `carousel` and `rail` name one topology, and the duplicate is resolved before ships

Either `rail` is dropped for `carousel`, or `carousel` is deprecated to `rail` with the
author-facing token aliased. Not left to be discovered when both vocabularies exist.

### D11 — `stack` is not named

It is default block flow. Naming the null case invites `stack-tight` and `stack-loose`,
which is rule 2's combinatorial explosion arriving by the back door.

## Implementation notes, deliberately not yet work items

1. **Close the two identity holes** (D4, D5). Independent of everything else, and one of them
   makes a shipped rule real.
2. **Verify the `attrs` reach** — whether `data-section` and `typeof` set through it are
   honoured downstream, which decides how urgent D5's guard is.
3. **Declare the ladder contract** and adopt it in the five hand-written containers, so the
   consolidation claim is proved by deletion.
4. **Widen the row's aperture** (D2), then let `Track` adopt `metaFields` + `blocks` (D7),
   which is the byline variant and the deletion of `track.css`'s hand-written push.
5. **Resolve the names** (D10) before either vocabulary is published.

## Non-goals

- `grid`, `split`, `tree` or any topology beyond `ladder` and `row` (D1)
- `childDefaults` / the per-instance cascade (D8)
- Promoting `layout` to a universal attribute — every universal today is decoration, so a
  structural one is a category change that needs its own argument
- {% ref "SPEC-145" /%} D15's multi-template mechanism, which this spec's variants section
  describes but does not specify
- Retiring `bar` as a rune; it stays as the author-facing exposure of the row

## Acceptance Criteria

- [ ] `sequence` is in `IDENTITY_FIELDS`, and a theme override attempting to change it is dropped and reported, asserted by a test naming ADR-030 rule 3 (D4)
- [ ] An `attrs` map cannot set an attribute whose configured source is identity-guarded; the attempt is rejected at config normalisation with the rune and key named (D5)
- [ ] Whether `data-section` / `typeof` set via `attrs` are honoured downstream is determined and recorded, before D5's guard is written
- [ ] A container can declare the `ladder` arrangement, and the five hand-written containers (`playlist`, `steps`, `timeline`, `itinerary`, `cast`) are re-expressed through it with their skeleton CSS deleted rather than duplicated
- [ ] A rune can point the `bar` arrangement at a named slot or list item, not only at `metaFields`-projected fields (D2)
- [ ] `Track` declares `metaFields` + `blocks`, its byline variant is a `variants` entry over `layout`, and `track.css`'s hand-written `margin-left: auto` is gone (D7)
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift across the ladder migration, on both contract copies
- [ ] The CSS-coverage test's known-gap sets shrink rather than grow, so a consolidation cannot be recorded as an exemption
- [ ] The authoring guide states D9's grouping-device rule, with `track`'s attribute-sourced escape named as luck rather than design
- [ ] `carousel` / `rail` resolve to one name, and the topology list no longer collides with the `track` rune (D10)

## References

- {% ref "ADR-030" /%} — the six rules this spec is the "later spec" for; rule 4 named `track.css`, rule 5a sets the bar both topologies clear, rule 6 supplies the group form
- {% ref "ADR-018" /%} — the canonical author-facing layout vocabulary, and half of D10's collision
- {% ref "SPEC-080" /%} — `metaFields` / `blocks` / `LayoutPrimitive`; the row's existing aperture
- {% ref "SPEC-081" /%} — `layout` projection and the `{ tag, children }` creating form the `attrs` back door lives in
- {% ref "SPEC-091" /%} — `variants`; how the declared path selects between two arrangements
- {% ref "SPEC-145" /%} — composed runes; D2's no-CSS rule is why this became load-bearing, D15 is the composed selection path, and D9 here is a template-authoring constraint like D17's
- {% ref "SPEC-155" /%} — the media audit; `emitTag` as this spec's prerequisite, and the two rune-specific row implementations
- {% ref "SPEC-151" /%} — the marketing audit; where D8's cascade question was left open
- {% ref "SPEC-146" /%} — name resolution; the boundary that makes D9's hazard silent
- {% ref "SPEC-143" /%} — the 20-of-126 `blocks` adoption gap D7 turns on
- {% ref "SPEC-094" /%} — the `@layer skeleton, skin` split that separates arrangement from decoration
- {% ref "SPEC-100" /%} — the `carousel` contract; the model for a block-agnostic arrangement
- {% ref "ADR-028" /%} — identity fields; what D4 and D5 both restore
- {% ref "SPEC-159" /%} — the surface treatment a container shares with its items; takes D8's theme-owned half and leaves the author-driven cascade here
- {% ref "SPEC-158" /%} — the identity guard's granularity; owns D4's `sequence` move and D5's `attrs` guard, so this spec inherits them rather than specifying them
- {% ref "ADR-038" /%} — behaviors bind on a data contract; the same rune-agnostic principle for behaviour

{% /spec %}
