{% spec id="SPEC-185" status="shipped" tags="runes, pullquote, blockquote, theme, intent, accessibility, testimonial, composition" released-in="v0.47.0" %}

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
already sees), *what* it is (a role, below), and *how loud* it is (a scale, `prominence`, D9). A
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
    size is loudness, which is `prominence` (D9).
- **`plain` is withdrawn before it is released.** It was added in v0.45.0 and is unpublished, so this
  is a changeset edit (as {% ref "SPEC-182" /%} D7 withdrew the testimonial codemod).
- **`align` stays.** It is placement, not decoration.
- **A theme retunes a role; it does not redefine it** (SPEC-159's bound). Every theme renders a
  featured quotation as a set-apart statement with its attribution; how it is set apart is its own.

### D3 — a theme styles roles, not the `blockquote` element

1. **Each role carries a marker**, `data-quote="quotation" | "featured" | "excerpt" | "epigraph"`, on
   the quotation's **outermost element**: the `<figure>` when it is attributed, the bare
   `<blockquote>` when it is not, the `<aside>` for an excerpt. A theme styles the role through it,
   with its `blockquote` and `figcaption` as descendants, and never guesses which wrapper holds it.
   - **Its own attribute**, one per vocabulary as `data-reading`, `data-media` and `data-meta-type`
     are. Not `data-section`, which names a part of a rune's own structure: a `>` in running text is
     part of none. Not a general content-role attribute: how text *speaks* (dialogue, lyrics, a
     caption; SPEC-159's voice role) is a different question from what kind of quotation it is, and
     keeping them apart lets one element carry both.
   - **Independent of rune names.** An epigraph comes from `section`'s header grammar or the page
     start, a quotation from the core node, and a later composition may make a featured quotation
     without `pullquote`, so the theme contract names roles, not runes.
2. **The quotation role comes from the core `blockquote` node.** A plain `>` that no rune consumes
   has no rune to mark it, so the node emits `data-quote="quotation"`.
3. **A rune that reinterprets `>` produces its own elements and never carries the marker**: tips,
   callouts and dialogue are not quotations, and no longer need to undo a quotation's style.
4. **A composition does not style what it reinterprets; it places the rune that is that thing.** A
   composed `recipe`'s tips are notes, so its template places them in a `hint` (`type="note"`, or a
   `tip` type if recipe's conversion shows one is needed), and the theme's hint treatment applies, as
   for any hint. The same holds for `comparison`'s callouts. Neither keeps tip or callout CSS of its
   own once it is composed: that is the rule every composition already follows (SPEC-145 D2), stated
   here because `>` is where the temptation lies.
5. **Lumina's global `blockquote` rule becomes its `[data-quote="quotation"]` rule.** A blockquote with
   no marker (third-party content transformed outside refrakt's nodes) gets a minimal, unopinionated
   fallback at zero specificity, so it is never unstyled to the point of illegibility.
6. **The reading register is context a theme may use.** A quotation in `prose` and one in `ui` (a
   card body) may be styled differently: Lumina keeps its rule and glyph in prose and sets a quotation
   quieter in `ui`. The role is the same; the context differs (SPEC-108).

### D4 — `pullquote` is the featured quotation; the excerpt is an option of it

One rune, because the two cases look the same and differ in how they are read. It keeps its name and
gains **`quote` as an alias**, the name for its default case; renaming is not decided (open question
2).

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

1. It stands in the epigraph position: after a `section`'s headline (and its blurb, when there is
   one) and before the body; or at the very start of a page's content, or directly after its `#`
   title (many layouts take the title from frontmatter, so the content may have none).
2. It carries an attribution (D6), in either position.

Without an attribution it stays a quotation. That keeps the ordinary opening quotation from being
misread: epigraphs almost always name their source, and requiring one is SPEC-182 D3's rule ("match
only when the required parts are there") applied to position. No new rune.

- **It is part of `section`'s header grammar** ({% ref "ADR-046" /%}), as one more optional group
  after the blurb ({% ref "SPEC-186" /%} D1, D5). `section` reads its header from the content a
  composition places in it, so **every rune composed over `section` reads epigraphs the same way**:
  `hero`, `cta`, `testimonial`, and `card` once it is composed. That is the intended reach:
  reinterpretation means the same Markdown means the same thing in every rune. A card's epigraph need
  not look like an essay's; the theme styles the role by context (D3.6).
- **The quote and its attribution are read as one unit**, optional together and required within:
  a lone attribution after a headline is not an epigraph, and stays the blurb it is today.
- **A heading inside a body does not open an epigraph.** It is the extension most likely to misread
  ordinary content (a source quoted under a docs heading), and the cheapest to add later.
- A composition that never wants one sets the placed `section`'s `header="headline"`.

### D6 — attribution is one shared part

Every role that carries a source reads it the same way and renders it the same way:

- **Read** from either of two positions, with one item model (`**Name**` required, then the source
  after a dash or comma, as SPEC-182 D6 fixed for testimonials):
  - **after** the quotation, a `**Name** — Source` paragraph directly following it. Read wherever a
    rune owns the sequence: `pullquote`, a composition's model, `section`'s epigraph position. The
    quote and the attribution are one group ({% ref "SPEC-186" /%} D1), so an attribution is never
    read without a quote.
  - **inside** it, as the blockquote's last paragraph, `— **Name**, Source`: the leading dash marks it,
    so a quote ending in bold text is not misread. Read by a nested model on the `blockquote` field
    (SPEC-186 D2, D3), so it works in a composition as it does in a native rune, and by the core
    `blockquote` node, which gives a plain quotation an attribution with no rune.
  - **The after form can ship first.** It needs only SPEC-182's paragraph model and SPEC-186 D1; the
    inside form waits for SPEC-186 D2–D3.
- **Rendered** as `<figcaption>`, the name in `<cite>`.
  *Amended 2026-11-09* by {% ref "SPEC-194" /%} D13: the shared part becomes the template-only
  `attribution` primitive, so a rune written as a definition can place it. The output is
  unchanged. D13 also proposes dropping the excerpt's `<aside>` (D1, D4), which needs agreement
  before it lands.
- A quotation (role 1) with an attribution becomes a `<figure>`; without one it stays a bare
  `<blockquote>`.

### D7 — the composed testimonial places a featured quotation

The staged `testimonial` places `{% pullquote %}` for its quote, with no variant: a testimonial's
quote is a featured quotation, and its look in a card comes from the theme and the `ui` register, not
from the composition. The testimonial keeps what is its own meaning: the rating, and the `Review` /
`Person` / `Rating` schema.

**The pullquote owns the attribution.** It reads the `**Name** — Role` paragraph (D6) and renders
the `<figcaption>`, so the testimonial no longer has a byline of its own:

- The testimonial's `attribution` field and its `fills` ({% ref "SPEC-182" /%} D6) go: the paragraph
  is the pullquote's content now, placed with the quote.
- Its `byline` meta block goes with them. The `<figcaption>` is the byline.
- **Its schema reads the attribution from the pullquote**: `author` and `role` resolve to the
  `<figcaption>`'s name and role nodes, as `reviewBody` already resolves to the pullquote's quote
  across the placed rune. The `Review` / `Person` graph is unchanged, which the SEO baseline checks.
- `author` and `role` stay declared on the testimonial for the attribute form (SPEC-182 D4), and fill
  the pullquote's attribution when written, so both forms render one `<figcaption>`.

This amends SPEC-182 D6: the paragraph reading it introduced is kept, and moves from the testimonial
to the pullquote, where every role reads attribution the same way.

### D8 — what happens to the interim fixes

- **`plain`** (#746, unreleased) is withdrawn under D2.
- **The unwrap in #747** (no blockquote nested in a blockquote) is right and is folded into D4, where
  the root becomes `<figure>`, so pullquote's markup changes once rather than twice.

### D9 — a featured quotation's loudness is its `prominence`

`prominence` scales a page-section header, and {% ref "SPEC-183" /%} made it a register for the whole
header. A featured quotation is the centrepiece of its block in the same way, so it takes the same
axis rather than a new one:

- **The gate widens.** The prominence facet applies to a rune with a header role, *or* one marked as
  a featured quotation or an excerpt (D3). On a plain quotation (role 1) it stays unavailable.
- **The steps keep their meaning.** `quiet` and `normal` are a quotation's own size, `prominent` and
  `display` a set-apart one, `marquee` a page's centrepiece. The theme maps each step to the quote's
  type size, as it maps them to a header's; Lumina ramps from the quote's resting size, as it ramps a
  title (WORK-538).
- **`accent`'s extra size** (D2) is `prominence="prominent"`.
- A testimonial's quote is `normal` in a card; a quote set as its own band is `display` or `marquee`.

## Not in scope

- **Callouts, tips and dialogue.** They are not quotations (D3.3); their own runes style them.
- **Inline quotations** (`<q>`). A separate question.
- **A theme other than Lumina.** This spec sets the contract a second theme must meet; it does not
  write one.

## Open questions

1. *(Settled 2026-11-01: `prominence`, D9.)*
2. **Renaming.** D4 adds `quote` as an alias. Whether `quote` later becomes the name and `pullquote`
   the alias is left until the alias has been in use.
3. *(Settled 2026-11-01: `section`'s header grammar, so every rune composed over it, and the page
   start; not headings inside a body. D5.)*
4. *(Settled 2026-11-01: the pullquote owns it, D7.)*
5. *(Settled 2026-11-01: `data-quote` with `quotation | featured | excerpt | epigraph`, on the
   outermost element, D3.1.)*

## Acceptance Criteria

- [ ] The core `blockquote` node marks a quotation `data-quote="quotation"`; runes that reinterpret `>` carry no marker
- [ ] Lumina styles the quotation role, not the bare element, with a minimal fallback for an unmarked blockquote, and a quieter quotation in the `ui` register
- [ ] `pullquote` renders `<figure><blockquote>…</blockquote>[<figcaption>…</figcaption>]</figure>`, never a nested blockquote, marked `data-quote="featured"`
- [ ] `{% pullquote excerpt %}` renders as `<aside aria-hidden="true">`, marked `data-quote="excerpt"`
- [ ] An attribution paragraph is read the same way for every role and rendered as `<figcaption>` with `<cite>`
- [ ] A blockquote after a page or section title with an attribution is an epigraph, `data-quote="epigraph"`; without an attribution it stays a quotation
- [ ] `pullquote`'s `variant` warns as deprecated, and `plain` is withdrawn before release
- [ ] `pullquote` accepts the `quote` alias, and takes `prominence` (D9), which ramps the quote's size
- [ ] The staged testimonial places `{% pullquote %}` with no variant, the pullquote renders its attribution, and the testimonial's `Review` / `Person` graph is unchanged, read from the pullquote
- [ ] A composed rune that reinterprets `>` places the rune that is that thing (a `hint` for tips) and ships no style for it
- [ ] The theme-authoring docs list the four roles as part of the theme contract, and the pullquote and blockquote docs describe roles, not looks

## References

- {% ref "SPEC-159" /%}: intent, not look; "retune, don't redefine"; composite intents.
- {% ref "SPEC-108" /%}: reading registers, the context D3.5 uses.
- {% ref "SPEC-182" /%}: paragraph reading (D4, D6) and match-only-when-present (D5); D6 amended by D7.
- {% ref "SPEC-145" /%}: D2, a composition has no style of its own (D3.4).
- {% ref "SPEC-183" /%}: `prominence` as a register (D9).
- {% ref "SPEC-186" /%}: the content-model constructs D5 and D6 are declared with: groups, nested models, `position: last`.
- {% ref "ADR-046" /%}: header grammar by position (D5).
- {% ref "ADR-030" /%}: variants are modifiers; semantics are rune-locked.

{% /spec %}
