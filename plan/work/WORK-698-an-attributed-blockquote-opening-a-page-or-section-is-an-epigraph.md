{% work id="WORK-698" status="in-progress" priority="medium" complexity="moderate" source="SPEC-185" tags="epigraph, section, quotation, header" milestone="v0.47.0" %}

# An attributed blockquote opening a page or section is an epigraph

SPEC-185 D5: a blockquote with an attribution in the epigraph position (after a section's headline and blurb, or at the start of a page's content) is an epigraph.

## Acceptance Criteria
- [x] `section`'s header group gains an optional `epigraph` group (quote, attribution) after the blurb, so every rune composed over `section` reads it
- [x] A blockquote at the start of a page's content, or directly after its `#` title, with an attribution, is an epigraph
- [x] A blockquote without an attribution stays a quotation, and a lone attribution after a headline stays the blurb
- [x] An epigraph renders as `<figure data-quote="epigraph">` with its `<figcaption>`, and Lumina styles it

## Blocked by

- {% ref "WORK-695" /%}
- {% ref "WORK-697" /%}

## References

- {% ref "SPEC-185" /%}: D5.

{% /work %}
