---
title: Spacing
description: Spacing scale, border radius, and shadow token display
---

{% hint type="note" %}
This rune is part of **@refrakt-md/design**. Install with `npm install @refrakt-md/design` and add `"@refrakt-md/design"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Spacing

Displays design tokens for spacing, border radius, and shadows. Content is organized by `##` sections — `Spacing`, `Radius`, and `Shadows` — with `name: value` list items in each.

## Full token set

A complete spacing system with scale, radii, and shadows.

{% preview source=true %}

{% spacing title="Design Tokens" %}
## Spacing
- unit: 4px
- scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32

## Radius
- sm: 4px
- md: 8px
- lg: 12px
- full: 9999px

## Shadows
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.1)
- lg: 0 10px 15px rgba(0,0,0,0.1)
{% /spacing %}

{% /preview %}

## Spacing scale only

Show just the spacing scale without radii or shadows.

{% preview source=true %}

{% spacing title="Spacing Scale" %}
## Spacing
- unit: 8px
- scale: 0, 1, 2, 3, 4, 6, 8, 12, 16
{% /spacing %}

{% /preview %}

## Radius and shadows

Document visual tokens without a spacing scale.

{% preview source=true %}

{% spacing title="Visual Tokens" %}
## Radius
- none: 0
- sm: 4px
- md: 8px
- lg: 16px
- pill: 9999px

## Shadows
- subtle: 0 1px 2px rgba(0,0,0,0.04)
- card: 0 4px 12px rgba(0,0,0,0.08)
- elevated: 0 12px 24px rgba(0,0,0,0.12)
{% /spacing %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | — | Section heading |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
