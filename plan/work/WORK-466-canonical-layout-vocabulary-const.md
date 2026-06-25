{% work id="WORK-466" status="ready" priority="high" complexity="simple" source="ADR-018" milestone="v0.26.0" tags="layout,vocabulary,runes,architecture" %}

# Canonical layout vocabulary const (seed grid/list)

Create the shared canonical-layout-token const that {% ref "ADR-018" /%} establishes,
seeded with `grid` and `list`. This is the enabling work for the whole canonical-pool
model and the first thing {% ref "SPEC-099" /%} and {% ref "SPEC-100" /%} both build on.

## Scope

- Add a canonical-token const in a shared location every rune schema can import
  (`packages/runes` — alongside the other shared schema helpers). Seed set: `grid`,
  `list`. (`carousel` is added later by the carousel-token work item.)
- Shape it so a rune's `matches` array is built from canonical picks **plus** any local
  string literals (e.g. `LAYOUT.grid`, `LAYOUT.list`), per {% ref "ADR-018" /%} §4.
- No rune migrations in this item — purely introduce the const. Existing runes keep their
  literals until independently revisited (ADR-018 §5, lazy migration).
- Document the two-tier model + graduation rule in the rune-authoring guide so new runes
  pick from the pool rather than minting private values.

## Acceptance Criteria

- [ ] A canonical-token const exists in a shared importable location, seeded with `grid` and `list`.
- [ ] The const composes with local literals so a rune's `matches` is `canonical picks + local values`.
- [ ] No existing rune's values or output change as a result of this item (ADR-018 ships zero behaviour change on its own).
- [ ] The rune-authoring guide documents the canonical pool, the two-tier model, and the graduation rule.

## Dependencies

None. Foundational — the first work item; the feature layout axis and the carousel token both build on it.

## References

- Decision: {% ref "ADR-018" /%} (canonical layout vocabulary, §4 single shared const, §5 lazy migration).
- Consumers: {% ref "SPEC-099" /%} (first consumer — `grid`/`list`), {% ref "SPEC-100" /%} (adds `carousel`).

{% /work %}
