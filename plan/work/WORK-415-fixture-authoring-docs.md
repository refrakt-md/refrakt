{% work id="WORK-415" status="done" priority="low" complexity="simple" source="SPEC-102" milestone="v0.22.0" tags="fixtures,docs" %}

# Fixture-authoring docs

Document the fixture format, frontmatter fields, the `role` (coverage-vs-exemplar) split, and
the `<rune>.<scenario>.md` convention under the plugin/theme authoring section.

## Acceptance Criteria

- [x] A fixture-authoring guide covers the `.md` + frontmatter format, all fields, `role` semantics, scenarios, and where fixtures live (core + plugin).

## Dependencies

- Requires {% ref "WORK-411" /%} (format finalised).

## References

- {% ref "SPEC-102" /%} · `site/content/extend/plugin-authoring/`.

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes`.

### What was done
- Added `site/content/extend/plugin-authoring/fixtures.md` — a fixture-authoring guide covering: where fixtures live (core `packages/runes/fixtures/` + plugin `fixtures/` dir + inline `fixture` field), the `.md` + YAML frontmatter format, all fields (`rune`/`title`/`description`/`role`/`attributes`/`demonstrates`/`notes`), the `role` coverage-vs-exemplar semantics, the `<rune>.<scenario>.md` convention, the CI validation contract, and a pointer to the `placeholder:`/`icon:` image schemes for deterministic fixture imagery.
- Registered it in the Extend nav (`site/content/extend/_layout.md`, Plugin authoring group).

{% /work %}
