---
title: Gallery
description: Multi-image container with grid, carousel, or masonry layout
---

# Gallery

Multi-image container with grid, carousel, or masonry layout and optional lightbox overlay.

## Basic grid gallery

Images are displayed in a responsive grid by default.

{% preview source=true %}

{% gallery %}
![Mountain sunrise](https://picsum.photos/seed/sunrise/600/400)
![Forest path](https://picsum.photos/seed/forest/600/400)
![Ocean waves](https://picsum.photos/seed/ocean/600/400)
![Desert dunes](https://picsum.photos/seed/desert/600/400)
![Snowy peaks](https://picsum.photos/seed/peaks/600/400)
![River valley](https://picsum.photos/seed/valley/600/400)
{% /gallery %}

{% /preview %}

## Carousel layout

Horizontal scrolling with snap points and prev/next navigation.

{% preview source=true %}

{% gallery layout="carousel" %}
![Coastal cliffs](https://picsum.photos/seed/cliffs/600/400)
![Autumn leaves](https://picsum.photos/seed/autumn/600/400)
![Starry night](https://picsum.photos/seed/stars/600/400)
![Rolling hills](https://picsum.photos/seed/hills/600/400)
{% /gallery %}

{% /preview %}

## Masonry layout

Variable-height items arranged in a masonry grid (CSS progressive enhancement).

{% preview source=true %}

{% gallery layout="masonry" columns=4 %}
![Tall waterfall](https://picsum.photos/seed/waterfall/600/800)
![Wide panorama](https://picsum.photos/seed/panorama/800/400)
![Square garden](https://picsum.photos/seed/garden/500/500)
![Tall canyon](https://picsum.photos/seed/canyon/600/800)
{% /gallery %}

{% /preview %}

## Without lightbox

Disable the click-to-enlarge overlay.

{% preview source=true %}

{% gallery lightbox=false %}
![Lakeside cabin](https://picsum.photos/seed/cabin/600/400)
![Wildflower meadow](https://picsum.photos/seed/meadow/600/400)
{% /gallery %}

{% /preview %}

## Custom columns and gap

Control the number of columns and spacing between items.

{% preview source=true %}

{% gallery columns=2 gap="loose" caption="Vacation highlights" %}
![Sandy beach](https://picsum.photos/seed/beach/600/400)
![Golden sunset](https://picsum.photos/seed/sunset/600/400)
![Local market](https://picsum.photos/seed/market/600/400)
![Ancient temple](https://picsum.photos/seed/temple/600/400)
{% /gallery %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `grid` | One of `grid`, `carousel`, `masonry` |
| `columns` | `number` | `3` | Number of columns in the grid |
| `lightbox` | `boolean` | `true` | Enable click-to-enlarge image overlay |
| `gap` | `string` | `default` | Spacing between items: `none`, `tight`, `default`, `loose` |
| `caption` | `string` | — | Caption text displayed below the gallery |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
