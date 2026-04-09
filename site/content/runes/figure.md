---
title: Figure
description: Enhanced images with captions, sizing, and alignment
---

# Figure

Enhanced image display with caption, sizing, and alignment controls.

## With caption attribute

Set the caption directly on the rune.

{% preview source=true %}
{% figure caption="A coral reef teeming with life beneath turquoise waters" size="large" align="center" %}
![Coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
{% /figure %}
{% /preview %}

## With paragraph caption

If no `caption` attribute is provided, the first paragraph inside the rune is used as the caption.

{% preview source=true %}
{% figure size="medium" %}
![Hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)

Steam rising from volcanic hot springs in the Icelandic highlands.
{% /figure %}
{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `caption` | `string` | — | Caption text (falls back to first paragraph) |
| `size` | `string` | — | One of `small`, `medium`, `large`, `full` |
| `align` | `string` | — | One of `left`, `center`, `right` |

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
