---
title: Figure
description: Enhanced images with captions, sizing, and alignment
---

# Figure

Enhanced image display with caption, sizing, and alignment controls.

## With caption attribute

Set the caption directly on the rune.

```markdoc
{% figure caption="Architecture overview" size="large" align="center" %}
![Diagram](/images/architecture.png)
{% /figure %}
```

## With paragraph caption

If no `caption` attribute is provided, the first paragraph inside the rune is used as the caption.

```markdoc
{% figure size="medium" %}
![Photo](/images/photo.jpg)

Photo taken at the summit.
{% /figure %}
```

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
