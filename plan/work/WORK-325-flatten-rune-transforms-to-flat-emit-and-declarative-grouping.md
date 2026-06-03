{% work id="WORK-325" status="in-progress" priority="medium" complexity="complex" source="SPEC-081" tags="runes,plugins,transform,migration,layout" milestone="v0.18.0" %}

# Flatten rune transforms to flat-emit + declarative grouping

Migrate the runes that hand-build structural skeletons in TypeScript to emit a
**flat bag of `data-name` slots** (content interpretation only) and declare their
preamble / content / media grouping via the recursive `layout` from
{% ref "WORK-324" /%}. Output stays identical; the grouping moves from imperative
code to config.

## Acceptance Criteria

- [ ] Recipe, howto, character, realm, faction emit flat slots; their content /
  media columns and preamble `<header>` are created via `layout`, not the schema.
- [ ] Event, playlist, and the other meta-bearing page-section runes likewise
  emit flat slots + declarative grouping.
- [ ] Per-rune output is visually identical — snapshot / structure-contract
  parity against the pre-migration output.
- [ ] The `event` class of bug is structurally impossible: `headline` / `blurb`
  are addressable at the level `layout` places them (not buried in a
  schema-built wrapper).
- [ ] Full suite + both contracts green.

## Dependencies

- {% ref "WORK-324" /%} — the recursive `layout` resolver.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly.

{% /work %}
