{% work id="WORK-013" status="pending" priority="low" tags="runes, business" milestone="v1.0.0" %}

# Build `partner` Rune

> Ref: {% ref "SPEC-008" /%} (Unbuilt Runes) — Package: `@refrakt-md/business`

## Summary

Logo grid of partners, clients, investors, or sponsors with optional links. Common on company about pages and landing pages. Alias: `client`.

## Attributes

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `layout` | String | `'grid'` | No | `grid` (fixed columns) or `marquee` (scrolling) |
| `columns` | Number | `4` | No | Grid column count |
| `grayscale` | Boolean | `true` | No | Display logos in grayscale (color on hover) |

## Content Model

- Images → partner logos. Alt text becomes the partner name.
- Links wrapping images → partner logos with clickthrough URLs.
- Headings → section titles (for grouping: "Platinum Sponsors", "Gold Sponsors")
- Header group: heading + paragraph → section eyebrow/headline/blurb

## Transform Output

- typeof: `Partner`
- Tag: `<section>` with `property: 'contentSection'`
- Properties: `eyebrow`, `headline`, `blurb`, `layout`, `columns`, `grayscale`
- Refs: `logos` (ul of li elements, each containing an img or a>img)

## Implementation Tasks

1. Create schema in `runes/business/src/tags/partner.ts`
2. Add RuneConfig entry in `runes/business/src/config.ts`
3. Write CSS in `packages/lumina/styles/runes/partner.css`
4. Import CSS in `packages/lumina/index.css`
5. Add marquee scrolling behavior if `layout="marquee"` (candidate for `@refrakt-md/behaviors`)
6. Write tests in `runes/business/test/tags/partner.test.ts`
7. Create inspector fixture

{% /work %}
