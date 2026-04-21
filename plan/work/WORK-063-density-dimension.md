{% work id="WORK-063" status="done" priority="high" complexity="moderate" tags="transform, themes, dimensions" milestone="v0.9.0" source="SPEC-025" %}

# Density Dimension

> Ref: SPEC-025 (Universal Theming Dimensions — Density)

## Summary

Add a density dimension to rune configs and the identity transform. Runes declare a `defaultDensity` and the transform emits `data-density` on the rune's root element. Density controls spacing and detail level: `full` shows everything, `compact` truncates descriptions and hides secondary metadata, `minimal` shows only title and primary metadata.

Density is set automatically by context (dedicated page → full, grid cell → compact, list view → minimal) and can be overridden by the author via a `density` attribute.

## Acceptance Criteria

- [x] `RuneConfig` in `packages/transform/src/types.ts` gains `defaultDensity?: 'full' | 'compact' | 'minimal'`
- [x] Identity transform emits `data-density` on the rune's root element
- [x] Author can override density via `density="compact"` attribute on the rune tag
- [x] Context-based automatic density: rune inside grid → compact, rune inside list/backlog → minimal
- [x] All ~60 container-level rune configs annotated with `defaultDensity` per SPEC-025 Table 4
- [x] Unit tests verify density attribute emission for default, override, and context-based scenarios

## Approach

1. Add `defaultDensity` to `RuneConfig` interface
2. In the engine, when building the rune's root element attributes, set `data-density` from: author attribute override → context-based override → config default → `'full'`
3. Context detection: check if the current rune is nested inside a grid/list rune (via parent typeof)
4. Annotate all rune configs with defaults from SPEC-025 Table 4

## References

- {% ref "SPEC-025" /%} (Universal Theming Dimensions — Density, Table 4: Default Density)

{% /work %}
