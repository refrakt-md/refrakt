{% work id="WORK-064" status="done" priority="high" complexity="moderate" tags="transform, themes, dimensions" milestone="v0.9.0" source="SPEC-025" %}

# Section Anatomy Dimension

> Ref: SPEC-025 (Universal Theming Dimensions — Section Anatomy)

## Summary

Add a section anatomy mapping to rune configs and the identity transform. Runes declare a `sections` map that associates each structural ref with a standard section role (header, title, description, body, footer, media). The transform emits `data-section` attributes alongside existing BEM classes, enabling themes to style structural anatomy generically across all runes.

## Acceptance Criteria

- [x] `RuneConfig` in `packages/transform/src/types.ts` gains `sections?: Record<string, 'header' | 'title' | 'description' | 'body' | 'footer' | 'media'>`
- [x] Identity transform emits `data-section` on elements whose ref maps to a section role
- [x] Existing BEM classes and `data-name` attributes are preserved (additive only)
- [x] All container-level rune configs annotated with `sections` per SPEC-025 Table 1
- [x] `refrakt inspect` output shows `data-section` attributes on structural elements
- [x] Unit tests verify section attribute emission for a sample of runes

## Approach

1. Add `sections` to `RuneConfig` interface
2. In the engine's `applyBemClasses` or structure injection code, when a ref matches a key in the `sections` map, emit `data-section` with the mapped role value
3. Work through SPEC-025 Table 1 to annotate all rune configs

## References

- {% ref "SPEC-025" /%} (Universal Theming Dimensions — Section Anatomy, Table 1: Section Anatomy Map)

{% /work %}
