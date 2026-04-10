{% work id="WORK-112" status="done" priority="high" complexity="moderate" tags="transform, themes" milestone="v1.0.0" source="SPEC-033" %}

# Implement named slots with ordering for structure entries

Add a `slots` array to `RuneConfig` and `slot`/`order` fields to `StructureEntry`. The engine assembles children by iterating slots in declared order instead of using binary before/after placement. This is the core structural change in SPEC-033 that enables multi-zone layouts.

## Acceptance Criteria

- [ ] `RuneConfig` in `packages/transform/src/types.ts` has `slots?: string[]`
- [ ] `StructureEntry` has `slot?: string` and `order?: number` fields
- [ ] When `slots` is declared, the engine assembles children by iterating slots in order, collecting structure entries per slot sorted by `order`, and placing content children at the `'content'` slot
- [ ] When `slots` is not declared, existing before/after behavior is unchanged (backward compatible)
- [ ] When `slots` is declared, `before: true` maps to the first non-content slot and `before: false` maps to the last non-content slot
- [ ] Explicit `slot` assignments take precedence over `before` mapping
- [ ] `mergeThemeConfig` merges `slots` arrays (theme replaces base) and structure entries with slot assignments
- [ ] Unit tests cover: slot assembly ordering, order within slots, content slot placement, backward compat without slots, before-to-slot mapping, merge behavior
- [ ] TypeScript compiles cleanly across all packages
- [ ] All existing tests pass

## Approach

1. Add interface changes to `packages/transform/src/types.ts`
2. Modify the engine's child assembly logic in `packages/transform/src/engine.ts` to support slot-based ordering when `slots` is present
3. Implement the backward-compat mapping from `before` to slot positions
4. Update `mergeThemeConfig` in `packages/transform/src/merge.ts`
5. Write comprehensive tests for slot assembly, ordering, and backward compat

## References

- SPEC-033 (Feature 1 — Named Slots with Ordering)
- WORK-110 (value mapping should land first)
- WORK-111 (density contexts should land first)

{% /work %}
