{% work id="WORK-694" status="ready" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, resolver, validation" milestone="v0.47.0" %}

# A required content-model field that matched nothing is reported

SPEC-186 D4: a required field, group or member that took no node is reported `content-missing`, and a child a required field skips is no longer dropped.

## Acceptance Criteria
- [ ] A required field, group or member that took no node is reported `content-missing`, naming the field and the rune
- [ ] A child skipped by a required field stays for the next field, and is reported `content-unmatched` only if nothing takes it
- [ ] A sweep of `site/content`, the SEO fixtures and the composed fixtures lists every `content-missing`, and each is fixed or its field made optional
- [ ] `content-missing` is a warning in this release; its promotion to an error is a follow-up item

## References

- {% ref "SPEC-186" /%}: D4.

{% /work %}
