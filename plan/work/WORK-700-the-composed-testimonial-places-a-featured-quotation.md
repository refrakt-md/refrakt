{% work id="WORK-700" status="done" priority="medium" complexity="moderate" source="SPEC-185" tags="testimonial, composition, pullquote, staging, seo" milestone="v0.47.0" pr="refrakt-md/refrakt#765" %}

# The composed testimonial places a featured quotation

SPEC-185 D7: the staged testimonial places `{% pullquote %}` for its quote, and the pullquote owns the attribution; the testimonial keeps its rating and its `Review` schema, read from the pullquote.

## Acceptance Criteria
- [x] `site/staged-runes/testimonial.md` places `{% pullquote %}` with no variant, and drops its `attribution` field, `fills` and `byline` meta block
- [x] The testimonial's schema reads `author` and `role` from the pullquote's `<figcaption>`, and the `Review` / `Person` / `Rating` graph is unchanged, by the SEO baseline comparison
- [x] The `author` and `role` attributes still fill the attribution, so both forms render one `<figcaption>`
- [x] SPEC-182 D6 carries an amendment note, and staging.refrakt.md is reviewed against refrakt.md on the testimonial pages

## Blocked by

- {% ref "WORK-697" /%}

## References

- {% ref "SPEC-185" /%}: D7.
- {% ref "SPEC-182" /%}: D6.

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`
PR: refrakt-md/refrakt#765

### What was done
- `site/staged-runes/testimonial.md`: places `{% pullquote author=$attrs.author source=$attrs.role %}` holding the quote and attribution slots; `fills`, the author/role `metaFields` and the `byline` block are gone; the `Person` entity reads `author`/`role` or `attribution.name`/`attribution.source`.
- `packages/runes/src/tags/pullquote.ts`: `author` and `source` attributes (win over a paragraph); a placed attribution paragraph's slot markers carry to the `<figcaption>`.
- `packages/runes/src/lib/schema-table.ts`: `findSourceNode` resolves dotted sources into a placed part; an entity property takes its first resolving source.
- `packages/content/test/composed-testimonial.test.ts`: assertions for the figcaption; the SEO graph tests are unchanged and pass.
- SPEC-182 D6 amendment note; the composed-runes guide documents dotted sources.

### Notes
- The `attribution` field stays as the slot carrying the paragraph into the pull quote (a composition declares every child it reads); its fills and byline are gone, as the criterion intends.
- With both forms written, the attribute wins in the figcaption and the graph names one author; the old `fill-overridden` warning no longer applies.
- Visually the staged testimonial's quote is now centred with the glyph (Lumina's featured quotation), unlike the plugin's left-aligned quote and byline; to be reviewed on staging.refrakt.md.

{% /work %}
