{% work id="WORK-414" status="pending" priority="medium" complexity="moderate" source="SPEC-102" milestone="v0.22.0" tags="fixtures,testing,ci" %}

# Fixture validation in CI

Guard the corpus: every fixture must parse and transform, frontmatter is schema-checked, and
`plugin-validate` reports `role` coverage instead of only warning "no fixture".

## Acceptance Criteria

- [ ] A CI test parses + transforms every fixture in the corpus and fails on errors.
- [ ] Frontmatter is validated against the field schema (unknown keys / wrong types rejected).
- [ ] `plugin-validate` reports role coverage (e.g. "rune X has no `canonical` fixture").

## Dependencies

- Requires {% ref "WORK-411" /%} (format + loader).

## References

- {% ref "SPEC-102" /%} · `packages/cli/src/commands/plugin-validate.ts`.

{% /work %}
