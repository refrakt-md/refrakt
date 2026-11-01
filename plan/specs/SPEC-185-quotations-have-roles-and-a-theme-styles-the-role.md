{% spec id="SPEC-185" status="draft" tags="runes, pullquote, blockquote, theme, intent, accessibility, testimonial, composition" %}

# Quotations have roles, and a theme styles the role

A quotation in refrakt is styled by what element it is and by what look its author named. Lumina
decorates every `<blockquote>`, rule and glyph, wherever it appears. `pullquote` offers three named
looks (`default`, `accent`, `editorial`), and v0.45.0 added a fourth, `plain`, to take decoration
*off* again so a composed testimonial could look as its plugin did. That is backwards, and it does
not travel: every look is Lumina's, named by the author.

This spec names what a quotation **is**, four roles chosen by the author through syntax or position,
and leaves what each **looks like** to the theme. It applies {% ref "SPEC-159" /%}'s rule ("name the
intent; the theme owns the look") to quotations, and withdraws the look-names.

## Why

**The look-names fail as `polaroid` did.** SPEC-159 rejected `comic` and `polaroid` because a look
name is "a specification wearing the costume of a name": a theme cannot render `editorial`
differently without failing to do it. An editorial theme looks editorial by default; an author on a
docs site should not be choosing it per quote.

**`plain` exposed the problem.** The composed testimonial needed its quote undecorated. Instead of
the quote's role deciding that, the author (the composition) asked a decorated rune to remove its
decoration, so the testimonial looks right only because of how Lumina happens to be styled.

**`>` is not always a quotation, so the element is the wrong thing to style.** `recipe` reads `>` as
tips, `comparison` as callouts, `conversation` as dialogue, and `event`, `organization` and `symbol`
accept it as body content. A theme that styles `blockquote` as a quotation puts a rule and a glyph on
a recipe tip, and each of those runes undoes it.

**The variety an editorial theme wants comes from elsewhere.** A theme wanting different quotations
in different parts of a page is a real need, and every case of it has a home that is not an author's
look-name: *where* the quote sits (the region, the container, the reading register, which the theme
already sees), *what* it is (a role, below), and *how loud* it is (a scale, open question 1). A
remaining wish for pure variety is a composite intent (SPEC-159 Part 3), named for what the quote is
to the reader and defined by a theme or a pack.

## Decisions

### D1 — four roles of quotation

| Role | What it is | Authored as | HTML |
|---|---|---|---|
| **quotation** | someone else's words cited in support of the text; the text is the subject | `>` in running text | `<blockquote>`, or `<figure>` with a `<figcaption>` when attributed |
| **featured quotation** | a statement presented for its own sake; who said it is part of it | `{% pullquote %}` | `<figure><blockquote>…</blockquote><figcaption>…</figcaption></figure>` |
| **pull quote** | an excerpt of this text, repeated large for a skimming eye | `{% pullquote excerpt %}` | `<aside aria-hidden="true">` holding the same structure |
| **epigraph** | a short attributed quotation that opens a work or a section | `>` with an attribution, by position (D5) | `<figure>` with a `<figcaption>` |

The roles are the author's choice. What each looks like is the theme's.

### D2 — decoration belongs to the theme; the look-names are withdrawn

- **`pullquote`'s `variant` is deprecated**: `default`, `accent` and `editorial` name looks. It is
  accepted with a deprecation warning for a release, then removed.
  - `editorial` maps to nothing: on an editorial theme a featured quotation looks editorial already.
  - `accent`'s tinted background is the universal `tint`, which every rune already takes; its extra
    size is loudness (open question 1).
- **`plain` is withdrawn before it is released.** It was added in v0.45.0 and is unpublished, so this
  is a changeset edit (as {% ref "SPEC-182" /%} D7 withdrew the testimonial codemod).
- **`align` stays.** It is placement, not decoration.
- **A theme retunes a role; it does not redefine it** (SPEC-159's bound). Every theme renders a
  featured quotation as a set-apart statement with its attribution; how it is set apart is its own.

### D3 — a theme styles roles, not the `blockquote` element

1. **Each role carries a marker**, `data-quote="quotation" | "featured" | "excerpt" | "epigraph"`, on
   the element that holds it. A theme selects on the marker.
2. **The quotation role comes from the core `blockquote` node.** A plain `>` that no rune consumes
   has no rune to mark it, so the node emits `data-quote="quotation"`.
3. **A rune that reinterprets `>` produces its own elements and never carries the marker**: tips,
   callouts and dialogue are not quotations, and no longer need to undo a quotation's style.
4. **Lumina's global `blockquote` rule becomes its `[data-quote="quotation"]` rule.** A blockquote with
   no marker (third-party content transformed outside refrakt's nodes) gets a minimal, unopinionated
   fallback at zero specificity, so it is never unstyled to the point of illegibility.
5. **The reading register is context a theme may use.** A quotation in `prose` and one in `ui` (a
   card body) may be styled differently: Lumina keeps its rule and glyph in prose and sets a quotation
   quieter in `ui`. The role is the same; the context differs (SPEC-108).

### D4 — `pullquote` is the featured quotation; the excerpt is an option of it

One rune, because the two cases look the same and differ in how they are read:

- **By default it is a featured quotation**, read by assistive technology, as every current use of it
  (this site's examples quote other people) already is.
- **`excerpt` marks a true pull quote**: the words already appear in the text, so it renders as an
  `<aside aria-hidden="true">` and a screen reader does not read the passage twice.
- **Its structure is `<figure><blockquote>…</blockquote><figcaption>…</figcaption></figure>`.** The
  authored blockquote's content is the `<blockquote>`'s; it is never nested in a second one. An
  attribution, when present, is the `<figcaption>`.
- **It reads its attribution from a paragraph** after the quote, `**Name** — Source`, with the
  item-model reading {% ref "SPEC-182" /%} gave compositions (D6 below).

### D5 — an epigraph is recognised by position and attribution

A blockquote is an epigraph when **both** hold:

1. It stands directly after the page title, or after a `section`'s headline, before any body text.
   It is the same place an eyebrow is read from ({% ref "ADR-046" /%}), on the other side.
2. It carries an attribution (D6).

Without an attribution it stays a quotation. That keeps the ordinary opening quotation from being
misread: epigraphs almost always name their source, and requiring one is SPEC-182 D3's rule ("match
only when the required parts are there") applied to position. No new rune.

### D6 — attribution is one shared part

Every role that carries a source reads it the same way and renders it the same way:

- **Read** from a paragraph directly after the quotation, `**Name** — Source` (comma, en and em dash
  accepted as separators, as SPEC-182 D6 fixed for testimonials).
- **Rendered** as `<figcaption>`, the name in `<cite>`.
- A quotation (role 1) with an attribution becomes a `<figure>`; without one it stays a bare
  `<blockquote>`.

### D7 — the composed testimonial places a featured quotation

The staged `testimonial` places `{% pullquote %}` for its quote, with no variant: a testimonial's
quote is a featured quotation, and its look in a card comes from the theme and the `ui` register, not
from the composition. The testimonial keeps what is its own meaning: the rating, and the `Review` /
`Person` / `Rating` schema.

How the attribution is shared between pullquote's `<figcaption>` (D4) and the testimonial's
`author`/`role` values (which the schema and its byline read, SPEC-182) is open question 4.

### D8 — what happens to the interim fixes

- **`plain`** (#746, unreleased) is withdrawn under D2.
- **The unwrap in #747** (no blockquote nested in a blockquote) is right and is folded into D4, where
  the root becomes `<figure>`, so pullquote's markup changes once rather than twice.

## Not in scope

- **Callouts, tips and dialogue.** They are not quotations (D3.3); their own runes style them.
- **Inline quotations** (`<q>`). A separate question.
- **A theme other than Lumina.** This spec sets the contract a second theme must meet; it does not
  write one.

## Open questions

1. **Loudness.** Featured quotations and pull quotes need a size scale, from a quiet quote in a card
   to a centred band. Widen `prominence` beyond page-section headers ({% ref "SPEC-183" /%} already
   made it a whole-header register) or give quotations their own scale?
2. **Naming.** "Pull quote" names the excerpt case, which D4 makes the option. Keep `pullquote`, add
   `quote` as an alias, or rename with a deprecation?
3. **Epigraph scope.** The page title and a `section`'s headline (D5). Any other header owner, such
   as a `card`?
4. **Testimonial attribution.** Does pullquote own the attribution and render the `<figcaption>`,
   with the testimonial reading the values back for its schema, or does the testimonial keep reading
   them (SPEC-182) and hand pullquote nothing to caption?
5. **The marker's name and values.** `data-quote` with `quotation | featured | excerpt | epigraph`,
   or a `data-section`-style role?

## Acceptance Criteria

- [ ] The core `blockquote` node marks a quotation `data-quote="quotation"`; runes that reinterpret `>` carry no marker
- [ ] Lumina styles the quotation role, not the bare element, with a minimal fallback for an unmarked blockquote, and a quieter quotation in the `ui` register
- [ ] `pullquote` renders `<figure><blockquote>…</blockquote>[<figcaption>…</figcaption>]</figure>`, never a nested blockquote, marked `data-quote="featured"`
- [ ] `{% pullquote excerpt %}` renders as `<aside aria-hidden="true">`, marked `data-quote="excerpt"`
- [ ] An attribution paragraph is read the same way for every role and rendered as `<figcaption>` with `<cite>`
- [ ] A blockquote after a page or section title with an attribution is an epigraph, `data-quote="epigraph"`; without an attribution it stays a quotation
- [ ] `pullquote`'s `variant` warns as deprecated, and `plain` is withdrawn before release
- [ ] The staged testimonial places `{% pullquote %}` with no variant and still publishes its `Review` graph
- [ ] The theme-authoring docs list the four roles as part of the theme contract, and the pullquote and blockquote docs describe roles, not looks

## References

- {% ref "SPEC-159" /%}: intent, not look; "retune, don't redefine"; composite intents.
- {% ref "SPEC-108" /%}: reading registers, the context D3.5 uses.
- {% ref "SPEC-182" /%}: paragraph reading (D4, D6) and match-only-when-present (D5).
- {% ref "SPEC-183" /%}: `prominence` as a register (open question 1).
- {% ref "ADR-046" /%}: header grammar by position (D5).
- {% ref "ADR-030" /%}: variants are modifiers; semantics are rune-locked.

{% /spec %}
