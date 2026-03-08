---
title: Gallery
description: Multi-image container with grid, carousel, or masonry layout
---

# Gallery

Multi-image container with grid, carousel, or masonry layout and optional lightbox overlay.

## Basic grid gallery

Images are displayed in a responsive grid by default.

```markdoc
{% gallery %}
![Mountain sunrise](/images/sunrise.jpg)
![Forest path](/images/forest.jpg)
![Ocean waves](/images/ocean.jpg)
![Desert dunes](/images/desert.jpg)
![Snowy peaks](/images/peaks.jpg)
![River valley](/images/valley.jpg)
{% /gallery %}
```

## Carousel layout

Horizontal scrolling with snap points and prev/next navigation.

```markdoc
{% gallery layout="carousel" %}
![Slide 1](/images/slide1.jpg)
![Slide 2](/images/slide2.jpg)
![Slide 3](/images/slide3.jpg)
![Slide 4](/images/slide4.jpg)
{% /gallery %}
```

## Masonry layout

Variable-height items arranged in a masonry grid (CSS progressive enhancement).

```markdoc
{% gallery layout="masonry" columns=4 %}
![Tall image](/images/tall.jpg)
![Wide image](/images/wide.jpg)
![Square image](/images/square.jpg)
![Another tall](/images/tall2.jpg)
{% /gallery %}
```

## Without lightbox

Disable the click-to-enlarge overlay.

```markdoc
{% gallery lightbox=false %}
![Photo 1](/images/photo1.jpg)
![Photo 2](/images/photo2.jpg)
{% /gallery %}
```

## Custom columns and gap

Control the number of columns and spacing between items.

```markdoc
{% gallery columns=2 gap="loose" caption="Vacation highlights" %}
![Beach](/images/beach.jpg)
![Sunset](/images/sunset.jpg)
![Market](/images/market.jpg)
![Temple](/images/temple.jpg)
{% /gallery %}
```

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
