{% work id="WORK-110" status="done" priority="high" complexity="simple" tags="transform, themes" milestone="v1.0.0" %}

# Add value mapping to modifier config

Extend `ModifierConfig` with `valueMap` and `mapTarget` fields so that modifier values can be declaratively mapped to different data attribute values. This is the smallest SPEC-033 feature and eliminates 2 existing `postTransform` uses.

## Acceptance Criteria

- [ ] `ModifierConfig` in `packages/transform/src/types.ts` has `valueMap?: Record<string, string>` and `mapTarget?: string` fields
- [ ] The engine's modifier resolution in `packages/transform/src/engine.ts` applies `valueMap` before emitting data attributes — mapped values go to `mapTarget` (or the same attribute if `mapTarget` is not set)
- [ ] Unmapped values pass through unchanged
- [ ] `mergeThemeConfig` correctly merges `valueMap` overrides (theme replaces base valueMap per modifier)
- [ ] Unit tests cover: basic mapping, unmapped passthrough, mapTarget redirection, merge behavior
- [ ] TypeScript compiles cleanly across all packages
- [ ] All existing tests pass

## Approach

1. Add `valueMap` and `mapTarget` to `ModifierConfig` in `packages/transform/src/types.ts`
2. In the engine's modifier application logic, after resolving the raw value from meta tags, check for `valueMap` — if present, look up the value and replace it (or pass through if not found)
3. If `mapTarget` is set, emit the mapped value as a separate data attribute (e.g., `data-checked`) in addition to or instead of the original modifier attribute
4. Update `mergeThemeConfig` in `packages/transform/src/merge.ts` to handle `valueMap` (theme valueMap replaces base, not deep-merged)
5. Write tests validating the mapping behavior

## References

- SPEC-033 (Feature 2 — Value Mapping)

{% /work %}
