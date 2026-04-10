{% work id="WORK-114" status="done" priority="medium" complexity="complex" tags="transform, themes" milestone="v1.0.0" source="SPEC-033" %}

# Implement element projection (hide, group, relocate)

Add a `projection` field to `RuneConfig` that enables declarative structural reshaping of the output tree. Projection runs as a distinct pass after BEM class application but before meta tag filtering, operating on `data-name` addresses. This is SPEC-033's most powerful feature, giving themes control over schema-produced elements.

## Acceptance Criteria

- [ ] `RuneConfig` in `packages/transform/src/types.ts` has `projection?: { relocate?, group?, hide? }` with the interfaces from SPEC-033
- [ ] The engine implements a projection pass between Phase 6 (recursion/BEM) and Phase 7 (meta filtering)
- [ ] **Hide**: elements matching `hide` entries are removed from the children array entirely
- [ ] **Group**: elements matching `members` are collected, removed from current positions, wrapped in a new container with `data-name` set to the group key, and placed at the first collected member's position (or into a named slot)
- [ ] **Relocate**: elements found by `data-name` are moved into the target (another `data-name` element or a slot name) at the specified position (prepend/append)
- [ ] Execution order is hide → group → relocate (so groups can be relocation targets)
- [ ] Group wrappers get BEM element classes via normal `applyBemClasses` flow
- [ ] `mergeThemeConfig` handles `projection` (theme projection fully replaces base, not deep-merged)
- [ ] Unit tests cover: hide removes element, group collects and wraps, relocate moves into target, relocate into slot, combined hide+group+relocate, invalid data-name references are no-ops
- [ ] TypeScript compiles cleanly
- [ ] All existing tests pass

## Approach

1. Add `projection` interfaces to types
2. Implement the projection pass as a separate function in the engine, called between Phase 6 and Phase 7
3. Each sub-pass (hide, group, relocate) walks the children array and applies its transformation
4. For `relocate` targeting slots, integrate with the slot assembly from WORK-112
5. Update merge logic
6. Write comprehensive tests for each operation and their composition

## References

- SPEC-033 (Feature 5 — Element Projection)
- WORK-112 (slots — projection relocate can target slot names)

{% /work %}
