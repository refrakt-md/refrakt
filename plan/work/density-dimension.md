{% work id="WORK-063" status="ready" priority="high" complexity="moderate" tags="transform, themes, dimensions" %}

# Density Dimension

> Ref: SPEC-025 (Universal Theming Dimensions — Density)

## Summary

Add a density dimension to rune configs and the identity transform. Runes declare a `defaultDensity` and the transform emits `data-density` on the rune's root element. Density controls spacing and detail level: `full` shows everything, `compact` truncates descriptions and hides secondary metadata, `minimal` shows only title and primary metadata.

Density is set automatically by context (dedicated page → full, grid cell → compact, list view → minimal) and can be overridden by the author via a `density` attribute.

## Acceptance Criteria

- [ ] `RuneConfig` in `packages/transform/src/types.ts` gains `defaultDensity?: 'full' | 'compact' | 'minimal'`
- [ ] Identity transform emits `data-density` on the rune's root element
- [ ] Author can override density via `density="compact"` attribute on the rune tag
- [ ] Context-based automatic density: rune inside grid → compact, rune inside list/backlog → minimal
- [ ] All ~60 container-level rune configs annotated with `defaultDensity` per SPEC-025 Table 4
- [ ] Unit tests verify density attribute emission for default, override, and context-based scenarios

## Approach

1. Add `defaultDensity` to `RuneConfig` interface
2. In the engine, when building the rune's root element attributes, set `data-density` from: author attribute override → context-based override → config default → `'full'`
3. Context detection: check if the current rune is nested inside a grid/list rune (via parent typeof)
4. Annotate all rune configs with defaults from SPEC-025 Table 4

## References

- SPEC-025 (Universal Theming Dimensions — Density, Table 4: Default Density)

{% /work %}
