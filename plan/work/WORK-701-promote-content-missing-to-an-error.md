{% work id="WORK-701" status="ready" priority="low" complexity="trivial" source="SPEC-186" tags="content-model, validation, resolver" %}

# Promote content-missing to an error

SPEC-186 D4.3: `content-missing` ships as a warning for one release, then becomes an error, as
`content-unmatched` did (WORK-638). WORK-694 shipped the warning, and its sweep found no instance
in `site/content`, `plan/`, the SEO fixtures, the rune and plugin fixtures or the composed
fixtures.

## Acceptance Criteria
- [ ] `CONTENT_MISSING_LEVEL` is `error`, after a release has shipped the warning
- [ ] The sweep is re-run first over every site and fixture, and anything it finds is fixed or its field made optional
- [ ] The content-models guide and the configuration reference say error, not warning

## References

- {% ref "SPEC-186" /%}: D4.3.
- {% ref "WORK-694" /%}: the warning and the sweep.

{% /work %}
