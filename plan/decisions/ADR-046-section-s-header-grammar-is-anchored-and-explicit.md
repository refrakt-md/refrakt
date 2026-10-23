{% decision id="ADR-046" status="accepted" date="2026-10-23" source="SPEC-160" tags="runes, section, composition, content-model, grammar, architecture" %}

# Section's header grammar is anchored and explicit

## Context

{% ref "ADR-041" /%} makes `section` the base that compositions place. The page-section runes
(`hero`, `cta`, `feature`, `pricing`, `reveal`, `tabs`, `accordion`, `steps`) are expected to
become compositions over it in time. Whatever `section` does with a leading paragraph or heading
then becomes the header grammar of that whole family.

Today the family has two grammars, and they disagree:

| Content | Native page-section runes (`pageSectionProperties`, `packages/runes/src/tags/common.ts`) | `section` (`packages/runes/src/tags/section.ts`) |
|---|---|---|
| Paragraphs, no heading | the first paragraph is the **blurb** | the first paragraph is the **eyebrow** |
| Paragraph, then heading | eyebrow, then headline | eyebrow, then headline |
| Two headings | the first heading is the **eyebrow** | the second heading is body |
| Heading, then prose, then a paragraph | the first paragraph after the heading, anywhere, is the blurb | only a paragraph directly after the heading is the blurb |

Composition makes `section`'s grammar read content that was never written as a header. A host
runs its content model over the expanded template, so an author's paragraph arriving through a
slot is matched by position like anything else:

- **{% ref "SPEC-169" /%} D4's `steps` example** places each step with
  `{% section %}{% slot /%}{% /section %}`. A step's text is a paragraph with no heading before
  it, so `section` renders it as an eyebrow: small, uppercase, in the primary colour.
- **A composed `testimonial`** ({% ref "SPEC-161" /%} D1) that places its quote and attribution
  slots in a `section` gets the quote as the eyebrow and the attribution as the blurb.
- **The composed `character`, `realm` and `faction`** escape only because their template places
  `{% metablock %}` between the heading and the description slot. Without it, the
  description's first paragraph would become a blurb. Nothing would report it.

A standalone `section` has the same problem, and {% ref "WORK-652" /%} makes it more common.
With a media split, `section` becomes the general "region with media" primitive. An image beside
two paragraphs then renders the first paragraph as an eyebrow.

## Options Considered

### (a) Accept positional matching

Record each case as an explained difference. Rejected: every case above is a misreading the
author did not ask for and cannot see coming.

### (b) Header roles come only from slots named for them

Inside a placed host, a header role is filled only by text the template wrote itself, or by a
slot whose name is the role's. Other slot content goes to the body. The slot markers SPEC-145
D10a puts on the AST make this implementable. Rejected, for four reasons:

- **The same markup means different things on a page and in a template.** A snippet pasted
  from a template body into a page changes meaning. {% ref "SPEC-170" /%} D2 rejected separate
  template and page parsers for exactly this reason.
- **It depends on invisible markers.** Neither `inspect` nor `reference` would show why a
  paragraph is or is not a blurb.
- **It couples input vocabulary to host roles.** A composition's field names are what its
  authors write and read in `reference`. `realm` would have to rename `description` to `blurb`
  to get the role, renaming its input for a styling reason.
- **It does nothing for a standalone `section`.**

Its strength, that a composition is correct without its author remembering anything, is kept by
the diagnostic in decision 3.

### (c) An explicit attribute on `section`

Chosen, together with an anchored grammar and a diagnostic.

## Decision

1. **The grammar is anchored to the headline.** Eyebrow and blurb exist only relative to a
   headline. With no heading there is no header: all content is body. An eyebrow is a paragraph
   directly before the headline, and a blurb is a paragraph directly after it.
2. **`section` takes `header`:**
   - `auto` (the default) reads eyebrow, headline and blurb as in decision 1;
   - `headline` lifts only the headline, so the paragraph after it stays body;
   - `none` reads no header at all: the region is all body.

   The attribute applies wherever `section` is used, standalone or placed by a composition.
   A composition sets it like any other attribute, for example `{% section header="headline" %}`.
3. **A slot that lands in a header role it is not named for is reported.** At transform time,
   when content carrying a slot marker fills a header role and the slot's name is not that
   role's, the build warns, naming the composed rune, the slot, the role and both remedies. For
   example: *"slot `description` of `character` is read as `section`'s blurb; name the field
   `blurb`, or set `header="headline"` on the section."* The warning changes nothing that renders.
4. **The page-section runes keep their native grammar until each one becomes a composition.**
   A composed page-section rune parses its author's content with its own content model and
   places the result. It does not inherit `pageSectionProperties`' rules through `section`.

## Rationale

- **The anchoring alone fixes every misreading found**: the `steps` and `testimonial` cases
  and the standalone region with media. None of them has a heading.
- **An attribute is visible and portable.** It shows in the source, in `inspect` and in
  `reference`, and means the same thing on a page and in a template.
- **The diagnostic is precise.** The slot markers are already on the AST, so the check sees
  exactly which slot filled which role, with no static guessing about what a slot may contain.
- **Deciding on `section` now is cheaper than later.** Every composition placed on it after this
  inherits the grammar, and changing it then would move every one of them.

## Consequences

- `section`'s output changes for content with no heading: a leading paragraph that rendered as an
  eyebrow is now body. The site's existing `section` examples all have a heading, but the
  changeset names the change for third-party content.
- {% ref "SPEC-169" /%} D4's `steps` example renders its steps as body.
- `header` is a new attribute on `section`. `reference` documents it, and the editor offers it.

## Open questions

- **A heading used as an eyebrow.** `hero`, `cta` and `feature` read two headings as an eyebrow
  heading and a headline. `section`'s eyebrow is a paragraph only, so a composed `hero` that
  places a heading eyebrow would get the wrong headline. This is the one case where (b)'s
  binding by name is cleaner. It is decided with {% ref "SPEC-160" /%} D7, when `hero` and `cta`
  become compositions. The options are an eyebrow field that also takes a heading followed by
  another heading, or a composed `hero` that turns its heading eyebrow into a paragraph.

## References

- {% ref "ADR-041" /%}: section is the composition base.
- {% ref "SPEC-160" /%}: D9 records this decision; D7 carries the open question.
- {% ref "SPEC-145" /%}: D10a (slot markers); the host's positional grammar reads the template's arrangement.
- {% ref "SPEC-169" /%}: D4's `steps` example.
- {% ref "SPEC-170" /%}: D2, one meaning for a snippet wherever it is pasted.
- {% ref "WORK-659" /%}: the implementation.

{% /decision %}
