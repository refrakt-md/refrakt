{% work id="WORK-066" status="ready" priority="medium" complexity="simple" tags="transform, themes, dimensions" %}

# Media Slots Dimension

> Ref: SPEC-025 (Universal Theming Dimensions — Media Slots)

## Summary

Add a media slots mapping to rune configs and the identity transform. Runes declare `mediaSlots` that map image ref names to media treatment types (portrait, cover, thumbnail, hero, icon). The transform emits `data-media` on image elements, enabling themes to style all media uniformly — circular portraits, full-width covers, small thumbnails — with ~5 CSS rules.

## Acceptance Criteria

- [ ] `RuneConfig` in `packages/transform/src/types.ts` gains `mediaSlots?: Record<string, 'portrait' | 'cover' | 'thumbnail' | 'hero' | 'icon'>`
- [ ] Identity transform emits `data-media` on image/media elements whose ref maps to a media slot
- [ ] Rune configs annotated per SPEC-025 Table 2: Character portrait → portrait, Recipe image → cover, Track artwork → thumbnail, Hero media → hero, etc.
- [ ] `refrakt inspect` output shows `data-media` attributes on media elements
- [ ] Unit tests verify media attribute emission

## Approach

1. Add `mediaSlots` to `RuneConfig` interface
2. In the engine, when processing a structure entry or content element whose ref matches a key in `mediaSlots`, emit `data-media` with the mapped slot type
3. Annotate rune configs per SPEC-025 Table 2

## References

- SPEC-025 (Universal Theming Dimensions — Media Slots, Table 2: Media Slots Map)

{% /work %}
