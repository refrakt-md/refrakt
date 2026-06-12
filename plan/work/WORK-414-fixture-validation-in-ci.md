{% work id="WORK-414" status="pending" priority="medium" complexity="moderate" source="SPEC-102" milestone="v0.22.0" tags="fixtures,testing,ci" %}

# Fixture validation in CI

Guard the corpus: parse the frontmatter *fields* (the format established in {% ref "WORK-411" /%}
strips the block; this work consumes it), validate them against the schema, support
`<rune>.<scenario>.md` scenarios, and ensure every fixture parses + transforms. `plugin-validate`
reports `role` coverage instead of only warning "no fixture".

## Acceptance Criteria

- [ ] Frontmatter fields (`role`, `attributes`, `demonstrates`, `notes`) are parsed into the manifest and `<rune>.<scenario>.md` scenarios load.
- [ ] A CI test parses + transforms every fixture in the corpus and fails on errors.
- [ ] Frontmatter is validated against the field schema (unknown keys / wrong types rejected).
- [ ] `plugin-validate` reports role coverage (e.g. "rune X has no `canonical` fixture").

## Dependencies

- Requires {% ref "WORK-411" /%} (format + loader).

## References

- {% ref "SPEC-102" /%} · `packages/cli/src/commands/plugin-validate.ts`.

{% /work %}
