{% work id="WORK-683" status="ready" priority="medium" complexity="simple" source="SPEC-181,SPEC-147" tags="runes, composition, staging, storytelling" %}

# Stage the storytelling compositions in the storytelling plugin

The composed `bond`, `character`, `faction`, `lore` and `realm` were built for
{% ref "SPEC-147" /%}. They live in
`packages/content/test/fixtures/composed-storytelling/runes/`. Under {% ref "SPEC-181" /%} they
are staged replacements for plugin runes, so they move to `plugins/storytelling/staging/`, and
their reference pages get mirrors.

## Acceptance Criteria

- [ ] The five definitions are moved (`git mv`) to `plugins/storytelling/staging/`
- [ ] `packages/content/test/composed-storytelling.ts` and `packages/language-server/test/rune-dir.test.ts` read them there, and every storytelling composition test passes unchanged
- [ ] The scenario fixtures (`<rune>.<scenario>.md`) and the registry site stay test fixtures; only the definitions move
- [ ] The `main` site adds `plugins/storytelling/staging` to `runes.staging.dirs`, and `/staging/runes/storytelling/character` (and the other four) render
- [ ] Contracts and the SEO baseline are unchanged

## Blocked by

- {% ref "WORK-682" /%}

## References

- {% ref "SPEC-181" /%}: D1, D6.
- {% ref "SPEC-147" /%}: D1, D2.

{% /work %}
