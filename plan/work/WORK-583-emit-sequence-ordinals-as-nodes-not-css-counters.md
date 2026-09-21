{% work id="WORK-583" status="ready" priority="medium" complexity="moderate" source="ADR-029" tags="runes, sequence, dom, a11y, theme, layout" %}

# Emit sequence ordinals as nodes, not CSS counters

A numbered sequence renders its ordinal through CSS:

```css
/* packages/skeleton/styles/dimensions/sequence.css */
[data-sequence="numbered"] { counter-reset: sequence; }
[data-sequence="numbered"] > li { counter-increment: sequence; }
[data-sequence="numbered"] > li::before { content: counter(sequence); … }
```

The number is therefore **not in the DOM**. It cannot be named, placed by a
layout tree, reordered, or moved inside a card. It is not selectable or
copyable, and generated content is inconsistently exposed to assistive
technology.

This item emits it as a real node.

## Why

The governing rule, which {% ref "ADR-030" /%} rule 3 states as a semantic fact:
**a numbered sequence's ordinal is information.** A playlist's `7` is the track
number, an identifier a listener says out loud; a recipe's `3` is referenceable
("go back to step 3"). Information belongs in the document, not in a stylesheet.

The mirror case confirms the rule rather than weakening it. A `connected`
sequence — `timeline`, `itinerary` — renders *no* number, because each item
carries its own positional label (`timeline.ts:44` emits a `<time>`), and a
numeral there would be false information. Decorative marks stay in CSS; a dot
connector or a separator is correctly generated content precisely because it
must not be copied.

> In the DOM if it's information. In CSS if it's ornament.

Three payoffs beyond correctness:

- **Theme rearrangement becomes possible.** A parent-driven, absolutely
  positioned counter is orphaned the moment a theme changes the container's
  topology — a card grid has nowhere to put it. Once the ordinal is a named
  part, a layout tree can place it. This is a practical prerequisite for
  {% ref "ADR-029" /%}'s `groups`.
- **Accessibility and copy/paste.** The number becomes real text.
- **The arrangement simplifies.** `[data-sequence]` stops generating content and
  becomes pure geometry.

## Scope

**In:** `sequence: 'numbered'` only.

**Out:** `connected` and `plain` keep no marker content — there is nothing to
promote. The decorative dot on `connected` stays a CSS `::before`.

## Approach

1. Add an ordinal node to the emitted item, named so the engine gives it a BEM
   element class and a layout-tree handle (e.g. `data-name="ordinal"`,
   `data-meta-type="quantity"` for tabular-nums).
2. Assign ordinals at transform time in the *parent*. `track.ts:192` only emits
   `numberMeta` when the author passed `number=`, so `playlist` must number its
   children — the parent-retypes-children pattern the {% ref "SPEC-130" /%} D9
   comment at `track.ts:128` already describes.
3. Remove `counter-reset` / `counter-increment` / `content: counter(…)` from
   `sequence.css`, keeping the marker's box geometry.
4. Keep the author's explicit `number=` authoritative where supplied, so a
   playlist with a gap or a non-1-based numbering renders what the author wrote.

## Interaction with BUG-024

{% ref "BUG-024" /%} removes four runes' *duplicate* counters and should land
first. This item then changes the single remaining mechanism. Doing it in the
other order means editing five counter implementations instead of one.

## Blocked by

- {% ref "BUG-024" /%}

## Acceptance Criteria

- [ ] A numbered sequence emits its ordinal as a text node, not as generated content
- [ ] The ordinal is selectable and copyable, and announced in document order
- [ ] `connected` and `plain` sequences emit no ordinal node
- [ ] An explicit `number=` on an item wins over the assigned ordinal
- [ ] `playlist` assigns ordinals to tracks that carry none
- [ ] The ordinal is addressable from a `layout` tree by name
- [ ] Both copies of `structures.json` are regenerated together and the new node appears in each
- [ ] `npm run seo:baseline:check` passes, or the baseline is regenerated and the diff reviewed — no schema change is expected, so an unexpected diff is a finding

## Risks

**Contract and baseline churn.** A new node in every numbered sequence touches
both contract copies and possibly the SEO baseline. Expected and reviewable, but
it makes this a poor candidate to batch with unrelated changes.

**Double-rendering during migration.** If the node ships before the CSS counter
is removed, items render two numbers. The two changes belong in one commit.

{% /work %}
