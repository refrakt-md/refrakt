{% work id="WORK-659" status="ready" priority="high" complexity="moderate" source="ADR-046,SPEC-160" tags="runes, section, composition, content-model, diagnostics" milestone="v0.43.0" %}

# section's header grammar is anchored to the headline, with a header attribute and a slot-role warning

`section` reads a leading paragraph as an eyebrow even when no heading follows. A composition
that places prose in a `section` gets it re-roled without any warning, and so does a standalone
`section` used as a region with media. {% ref "ADR-046" /%} anchors the grammar to the headline,
adds a `header` attribute, and warns when slot content lands in a header role it is not named
for.

It lands before {% ref "WORK-653" /%} and {% ref "WORK-654" /%}, which both compose over
`section`.

## Acceptance Criteria

- [ ] Before anything changes, fixtures record today's output for: a `steps` variant that places each step in `{% section %}{% slot /%}{% /section %}` as SPEC-169 D4's text does (the shipped `packages/runes/test/fixtures/composed/steps.md` places `textblock`, so it does not exercise `section`), a composed `testimonial` placing quote and attribution slots, a `character`-shaped template placing `section` with and without its `metablock` (the composed `character` places `card` until {% ref "WORK-653" /%}), a standalone `section` with only paragraphs, and a standalone `section` with an image and paragraphs
- [ ] With no heading, a `section` has no header and all content is body; an eyebrow is only a paragraph directly before the headline, and a blurb only a paragraph directly after it
- [ ] `section` accepts `header` (`auto | headline | none`, default `auto`); `headline` lifts only the headline, and `none` reads no header
- [ ] Content carrying a slot marker that fills a header role whose name differs from the slot's produces a build warning naming the composed rune, the slot, the role and both remedies; the rendered output is unchanged by the warning
- [ ] The existing composed fixtures (`bond`, `character`, `lore`, `realm`, `faction`, `teaser`, `steps`) render unchanged and raise no warning. None of them places `section` yet, so this only guards against collateral change; the real check that the storytelling compositions raise no warning on `section` is {% ref "WORK-653" /%}'s
- [ ] The recorded fixtures' new output is reviewed and every change explained in the resolution
- [ ] `inspect`, `reference` and the section docs page show the `header` attribute and the anchored grammar
- [ ] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move
- [ ] The changeset names the change for content with no heading

## Approach

- The slot markers ({% ref "SPEC-145" /%} D10a) are on the AST before transform, so the check
  reads the marker of whichever node fills `eyebrow`, `headline` or `blurb`.
- Give the warning its own error id, so it can be disabled through `validation.disableIds` like
  any other.
- The native page-section runes keep `pageSectionProperties` (ADR-046 decision 4). This item
  changes only `section`.

## Blocked by

- {% ref "WORK-651" /%}: the body role, so the anchored grammar's body is the declared one

## References

- {% ref "ADR-046" /%}
- {% ref "SPEC-160" /%}: D9.
- {% ref "SPEC-169" /%}: D4.

{% /work %}
