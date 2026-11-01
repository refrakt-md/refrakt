{% work id="WORK-695" status="ready" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, section, header, composition" milestone="v0.47.0" %}

# Section's header grammar is declared, and the hand-written reader goes

SPEC-186 D5: `section`'s header is read from a declared `header` group (eyebrow, headline, blurb), and `sectionHeaderParts` and its header-role reader are removed.

## Acceptance Criteria
- [ ] `section`'s content model declares its header as an optional group, and its transform reads the header from the resolved model
- [ ] The `header` attribute's `headline` and `none` modes are conditional models
- [ ] The media and footer zones split as before, through a delimited model
- [ ] `sectionHeaderParts` and the reader registered in `schemaHeaderRoles` are removed; the composition audit reads the declared model
- [ ] Every existing section, hero, cta and testimonial test passes unchanged

## Blocked by

- {% ref "WORK-692" /%}

## References

- {% ref "SPEC-186" /%}: D5.
- {% ref "ADR-046" /%}

{% /work %}
