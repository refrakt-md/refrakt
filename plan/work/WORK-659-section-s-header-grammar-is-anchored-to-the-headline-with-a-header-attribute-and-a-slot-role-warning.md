{% work id="WORK-659" status="done" priority="high" complexity="moderate" source="ADR-046,SPEC-160" tags="runes, section, composition, content-model, diagnostics" milestone="v0.43.0" pr="refrakt-md/refrakt#722" %}

# section's header grammar is anchored to the headline, with a header attribute and a slot-role warning

`section` reads a leading paragraph as an eyebrow even when no heading follows. A composition
that places prose in a `section` gets it re-roled without any warning, and so does a standalone
`section` used as a region with media. {% ref "ADR-046" /%} anchors the grammar to the headline,
adds a `header` attribute, and warns when slot content lands in a header role it is not named
for.

It lands before {% ref "WORK-653" /%} and {% ref "WORK-654" /%}, which both compose over
`section`.

## Acceptance Criteria

- [x] Before anything changes, fixtures record today's output for: a `steps` variant that places each step in `{% section %}{% slot /%}{% /section %}` as SPEC-169 D4's text does (the shipped `packages/runes/test/fixtures/composed/steps.md` places `textblock`, so it does not exercise `section`), a composed `testimonial` placing quote and attribution slots, a `character`-shaped template placing `section` with and without its `metablock` (the composed `character` places `card` until {% ref "WORK-653" /%}), a standalone `section` with only paragraphs, and a standalone `section` with an image and paragraphs
- [x] With no heading, a `section` has no header and all content is body; an eyebrow is only a paragraph directly before the headline, and a blurb only a paragraph directly after it
- [x] `section` accepts `header` (`auto | headline | none`, default `auto`); `headline` lifts only the headline, and `none` reads no header
- [x] Content carrying a slot marker that fills a header role whose name differs from the slot's produces a build warning naming the composed rune, the slot, the role and both remedies; the rendered output is unchanged by the warning
- [x] The existing composed fixtures (`bond`, `character`, `lore`, `realm`, `faction`, `teaser`, `steps`) render unchanged and raise no warning. None of them places `section` yet, so this only guards against collateral change; the real check that the storytelling compositions raise no warning on `section` is {% ref "WORK-653" /%}'s
- [x] The recorded fixtures' new output is reviewed and every change explained in the resolution
- [x] `inspect`, `reference` and the section docs page show the `header` attribute and the anchored grammar
- [x] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move
- [x] The changeset names the change for content with no heading

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

## Resolution

Completed: 2026-10-26

Branch: `claude/v0-43-0-review-ny4nl1`

### What was done
- `packages/runes/src/tags/section.ts`:
  - `sectionHeaderParts` implements ADR-046 decision 1. The transform reassembles the sequence's matched fields in source order and applies it.
  - New `header` attribute (`auto | headline | none`).
  - `section` names its parts directly instead of through `pageSectionProperties`, and registers its grammar in `schemaHeaderRoles`.
- `packages/runes/src/lib/header-roles.ts` (new): the `schemaHeaderRoles` side table and `auditSlotHeaderRoles`, which reports `slot-header-role`.
- `packages/runes/src/lib/composition.ts`: `CompiledComposition.place()`, the template expanded for one instance. `transform` uses it.
- `packages/runes/src/lib/index.ts`: a composition's schema `validate` runs the audit against `place()`.
- `packages/content/src/validate.ts`: `slot-header-role` added to `DEFAULT_VALIDATION_IDS`.
- Tests:
  - `packages/runes/test/section-header-grammar.test.ts`: the recorded fixtures, `header`, and the warning (message, no warning for template text, a slot named for its role or `header="headline"`).
  - `packages/content/test/validate.test.ts`: reported by default, demoted by `disableIds`.
- Docs: `runes/section.md`, `docs/configuration/reference.md`, `composed-runes.md`; `_data/rune-attributes.json` regenerated.

### Recorded fixtures, before → after
- Changed:
  - step list placing each step in `section`: step text in `<header>` as blurb → body;
  - quote card: quote as blurb and attribution in `<header>` → body;
  - paragraphs only: first paragraph as blurb → body;
  - image and paragraphs: image paragraph as blurb, plus a paragraph in `<header>` → body.
- Byte-identical:
  - eyebrow, heading and blurb;
  - the `character`-shaped composition with its `metablock`;
  - the same composition without it, which still reads `description` as the blurb and now raises the warning.

### Notes
- Today's no-heading output named the paragraph `blurb`, not `eyebrow` as ADR-046 says, because `pageSectionProperties` reads a header with no heading as a blurb.
- `header="headline"` lifts only a heading at the very start; a paragraph before it leaves no header, rather than moving the heading above it.
- The warning runs at validate time, because `Markdoc.validate` is the only path that reaches `refrakt validate` and the build summary. The composed rune's tag is on the page AST, so its `validate` can expand the template.
- The old `image` ref is gone, because it never matched: it searched the header's top level, which holds only `p` and `h*`. `.rf-section__image` CSS remains and is dead until WORK-652's media zone.
- Contracts do not change (`header` is not an engine modifier). The SEO baseline does not move. Every `section` in `site/content` starts with a heading.

{% /work %}
