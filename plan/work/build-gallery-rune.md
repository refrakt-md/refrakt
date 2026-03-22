{% work id="WORK-004" status="pending" priority="medium" tags="runes, core" %}

# Build `gallery` Rune

> Ref: SPEC-008 (Unbuilt Runes)

## Summary

Multi-image container with grid, carousel, or masonry layout and optional lightbox overlay. This is a core rune — it belongs in `packages/runes/src/tags/`, not in a community package.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `layout` | String | `'grid'` | No | Display mode: `grid`, `carousel`, `masonry` |
| `columns` | Number | `3` | No | Grid column count (grid/masonry only) |
| `lightbox` | Boolean | `true` | No | Enable click-to-enlarge overlay |
| `gap` | String | `'md'` | No | Spacing between items: `sm`, `md`, `lg` |
| `caption` | String | — | No | Gallery-level caption |

## Content Model

- Images (`![alt](src)`) become gallery items
- Image alt text becomes the item caption
- Paragraphs of text between images are ignored (or treated as section breaks in masonry)
- Headings become gallery section titles (for grouped galleries)

## Transform Output

- typeof: `Gallery`
- Tag: `<figure>`
- Properties: `layout`, `columns`, `lightbox`, `gap`, `caption`
- Refs: `items` (list of figure elements), `caption` (figcaption)

## Implementation Tasks

1. Create schema in `packages/runes/src/tags/gallery.ts`
2. Add RuneConfig entry in `packages/runes/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/gallery.css`
4. Import CSS in `packages/lumina/index.css`
5. Add carousel navigation + lightbox overlay behaviors in `packages/behaviors/`
6. Write tests in `packages/runes/test/tags/gallery.test.ts`
7. Create inspector fixture
8. Run CSS coverage tests

## Dependencies

- Carousel/lightbox behaviors need JS — candidate for `@refrakt-md/behaviors`

{% /work %}
