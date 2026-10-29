{% work id="WORK-682" status="ready" priority="medium" complexity="simple" source="SPEC-181,SPEC-147" tags="runes, composition, staging, storytelling" %}

# Stage the storytelling compositions on the staging site

The composed `bond`, `character`, `faction`, `lore` and `realm` were built for
{% ref "SPEC-147" /%}. They live in
`packages/content/test/fixtures/composed-storytelling/runes/`. Under {% ref "SPEC-181" /%} they
are staged replacements for plugin runes, so they move to `site/staged-runes/`. They stay
staged until SPEC-147's plugin-level decision (SPEC-181 D5).

## Acceptance Criteria

- [ ] The five definitions are moved (`git mv`) to `site/staged-runes/`
- [ ] `packages/content/test/composed-storytelling.ts` and `packages/language-server/test/rune-dir.test.ts` read them there, and every storytelling composition test passes unchanged
- [ ] The scenario fixtures (`<rune>.<scenario>.md`) and the registry site stay test fixtures; only the definitions move
- [ ] The `staging` site prefers `__project__` for all five, and their reference pages under `/runes/storytelling/` render with them
- [ ] `main`, the contracts and the SEO baseline are unchanged

## Blocked by

- {% ref "WORK-681" /%}

## References

- {% ref "SPEC-181" /%}: D1, D4, D5.
- {% ref "SPEC-147" /%}: D1, D2.

{% /work %}
