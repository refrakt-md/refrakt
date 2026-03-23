{% work id="WORK-004" status="done" priority="medium" tags="runes, core" %}

# Build `gallery` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes)

## Summary

Multi-image container with grid, carousel, or masonry layout and optional lightbox overlay. This is a core rune — it belongs in `packages/runes/src/tags/`, not in a community package.

## Status

Already implemented. Schema, config, CSS, and edit hints all exist:

- Schema: `packages/runes/src/tags/gallery.ts` (uses `createContentModelSchema`)
- Type: `packages/runes/src/schema/gallery.ts`
- Config: `packages/runes/src/config.ts` (block `gallery`, modifiers for layout/lightbox/gap/columns)
- CSS: `packages/lumina/styles/runes/gallery.css` (grid, carousel, masonry layouts + lightbox overlay)
- Registry: `Gallery` → `ImageGallery` in `packages/runes/src/registry.ts`

{% /work %}
