{% decision id="ADR-041" status="proposed" date="2026-10-09" source="SPEC-160" tags="runes, composition, primitives, card, section, architecture" %}

# Compose content on section, not card

## Context

{% ref "SPEC-145" /%} D18 made `card` the canonical primitive a composition places when it
wants a media split. The reasoning held up on mechanism: `card` carries
`base: SplitLayoutModel`, splits media / body / footer on `---`, unwraps a bare image, and
composing over it deletes helpers `recipe` hand-rolls. The storytelling compositions follow it:
`character`, `realm` and `faction` all place `{% card %}` and put the portrait in its media zone
(`packages/content/test/fixtures/composed-storytelling/runes/`).

Two observations since then say the choice was made on the wrong axis.

**`card` is a presentation; the runes composed over it are content.** Lumina draws a card as a
padded, bordered, rounded panel with its own surface fill (`packages/lumina/styles/runes/card.css`),
and the rune renders as a bare `<div>`. A character, a realm, a recipe or a hero is a titled
region of a page that may or may not be drawn as an object. {% ref "SPEC-159" /%} already
reached the same conclusion from the other side: its `materiality` axis treats "a flat panel vs
a card with edges" as an author's intent, not as a rune's identity.

**D20 is the symptom.** It measured `card` as *"the only split-layout rune without the
page-section anatomy"*: five of the eight `SplitLayoutModel` runes declare the identical
`preamble` / `title` / `description` triple and `card` declares `{ media, body }`. Its decision
was to grow `card` a placeable title, blurb and meta slot, at the cost of a no-drift migration
on every page that already places a card. That is retrofitting a section's anatomy into the
panel primitive, because the panel was chosen as the base. D20 is unimplemented.

`section` already has the anatomy D20 wants to add. It renders a real `<section>` with
`property: 'contentSection'` and a `<header>` holding eyebrow, headline and blurb, and declares
`{ preamble, headline: 'title', blurb: 'description' }`. What it lacks is the mechanism D18
chose `card` for: the media zone, the split attributes, the `cover` variant, and a footer.

The question is which of the two to grow. It is cheap to answer now: the composed runes still
sit beside their plugins rather than replacing them, and only three definitions place `card`.

## Options Considered

1. **Keep `card` as the base and implement D20.** Card gains flat `title`, `blurb` and `meta`
   slots and a `preamble` layout group. Every composition keeps working. But the base primitive
   stays a drawn object, so every composed rune inherits a border and a surface it then has to
   undo, and D14's universal attributes keep painting a second surface around the card (D14
   records `elevation`, `substrate` and `reveal` doing exactly that). And every existing
   `{% card %}` page takes the migration D20 called "the one part of this that is not cheap".
2. **Make `section` the base, and give it the split.** Section gains the media zone, the split
   attributes, `cover` and a footer, through one shared implementation that `card` also uses.
   `card` becomes a section that is drawn as an object. Existing `{% section %}` pages are
   protected by making the zoning opt-in. Composed runes get the anatomy and no surface.
3. **A new neutral primitive** (for example `entity` or `region`) with the anatomy and the
   split, leaving `card` and `section` alone. Avoids touching either rune's existing pages, but
   adds a third rune whose job overlaps both. An author choosing between `section` and the new
   rune would be choosing between two names for a titled region, which is the confusion this
   decision is meant to remove.

## Decision

**Option 2.** `section` is the primitive a composition places for a titled region of content,
with or without media. `card` is a `section` with a surface: the same anatomy and the same
split, drawn as a discrete object. {% ref "SPEC-160" /%} specifies the change.

This supersedes D18's choice of `card` as the canonical media-split primitive (the argument
that composing over a split primitive deletes work stands; the primitive changes) and D20's
decision to grow `card` a preamble. D20's measurements and its scope limit on `mediatext` stand.

## Rationale

- **The base should carry meaning, and the surface should be a choice.** A composition that
  wants a drawn object still gets one, by placing `card` or by `materiality` once it exists.
  A composition that wants a region no longer starts from an object and subtracts.
- **The anatomy is the larger part, and `section` has it.** D20 counts 23 runes declaring
  `preamble`, 29 declaring `blurb: 'description'`, 21 declaring `headline: 'title'`. Moving the
  split onto the rune that already speaks that vocabulary is smaller than moving the vocabulary
  onto the rune that has the split, and it does not change `card`'s existing output.
- **It is what the marketing compositions need.** {% ref "SPEC-151" /%} names `hero`, `cta`
  and `steps` as the first marketing migrations, and D20 notes that `hero` and `steps` hit
  `card`'s missing preamble before anything else. `hero` and `cta` already render as
  `<section>` with the preamble triple; on a `section` with a split they are compositions.
- **The timing is cheap.** Three definitions, all in test fixtures, place `card` today.

## Consequences

- `section` gains opt-in zoning. A `---` inside a `section` is ordinary body content today, and
  must stay so for every page that does not ask for a media zone (SPEC-160 D2).
- `card`'s split moves into a shared implementation. `card`'s own output must not drift:
  `refrakt contracts --check` and the gallery are the gate, as SPEC-143 D7 set for migrations.
- The three storytelling definitions are recomposed on `section`. Their fixtures' expected
  output changes; the registry and SEO comparisons against the plugin are re-run, not
  re-recorded silently.
- Hero and cta still lose their `rf-hero__*` / `rf-cta__*` element classes when composed,
  because a composition emits the primitive's classes (a composed `character` carries
  `rf-card__*` and no `rf-character` class at all). This is true whichever primitive they are
  built on, so it is not a cost of this decision, but SPEC-160 has to plan the theme side of
  it before hero and cta move.
- D14's chrome-carrier question gets a better default: the carrier is a `section`, which has
  no surface of its own for a universal attribute to double.
- `recipe` and `howto`, which D18 called composable over `card`, compose over `section`
  instead, and `recipe`'s `cover-scope="header"` is expressible there because `section`
  already has the `preamble` the cover dimension keys on.

{% /decision %}
