{% work id="WORK-111" status="done" priority="high" complexity="simple" tags="transform, themes" milestone="v1.0.0" source="SPEC-033" %}

# Replace hardcoded density contexts with configurable childDensity

Remove the hardcoded `COMPACT_CONTEXTS` and `MINIMAL_CONTEXTS` sets from the identity transform engine and replace them with a `childDensity` field on `RuneConfig`. This lets community packages declare density behavior without modifying the engine.

## Acceptance Criteria

- [x] `RuneConfig` in `packages/transform/src/types.ts` has `childDensity?: 'compact' | 'minimal'` field
- [x] The engine in `packages/transform/src/engine.ts` reads `childDensity` from the parent rune's config instead of checking hardcoded sets
- [x] `data-density` attribute is applied to child runes identically to current behavior
- [x] Core config in `packages/runes/src/config.ts` declares `childDensity` for Grid, Bento, Gallery, Showcase, Split (compact) and Backlog, DecisionLog (minimal)
- [x] Hardcoded `COMPACT_CONTEXTS` and `MINIMAL_CONTEXTS` sets are removed from the engine
- [x] Community packages can declare `childDensity` in their `RunePackage.theme.runes` config
- [x] All existing tests pass — HTML output is identical before and after
- [x] TypeScript compiles cleanly

## Approach

1. Add `childDensity` to `RuneConfig` in types
2. Add `childDensity` entries to the 7 core runes in `packages/runes/src/config.ts`
3. Modify the engine's density resolution to look up the parent's `RuneConfig.childDensity` from the theme config map
4. Remove the hardcoded sets
5. Verify with `refrakt inspect` that output is unchanged for affected runes

## References

- {% ref "SPEC-033" /%} (Feature 4 — Configurable Density Contexts)

{% /work %}
