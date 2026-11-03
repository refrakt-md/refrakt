{% work id="WORK-700" status="in-progress" priority="medium" complexity="moderate" source="SPEC-185" tags="testimonial, composition, pullquote, staging, seo" milestone="v0.47.0" %}

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

{% /work %}
