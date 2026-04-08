---
title: Showcase
description: Frame visual content with shadows, bleed, and aspect ratio control
---

# Showcase

Present visual content in a constrained viewport with optional decorative effects. The showcase rune wraps images, videos, or embedded content and adds shadow, bleed, offset, and aspect ratio controls — useful for presenting screenshots, product shots, or component previews.

## Basic usage

Wrap any visual content in a showcase to give it a framed presentation.

{% preview source=true %}

{% showcase %}
![Dashboard screenshot](https://picsum.photos/seed/dashboard/800/450)
{% /showcase %}

{% /preview %}

## Shadow

Add depth with a shadow effect. Three intensities are available.

{% preview source=true %}

{% showcase shadow="soft" %}
![Interface preview](https://picsum.photos/seed/interface/800/450)
{% /showcase %}

{% /preview %}

{% preview source=true %}

{% showcase shadow="elevated" %}
![Product shot](https://picsum.photos/seed/product/800/450)
{% /showcase %}

{% /preview %}

## Bleed

Allow the showcase to extend beyond its container's bounds. Useful for visually breaking out of a section's padding.

{% preview source=true %}

{% showcase shadow="soft" bleed="bottom" %}
![App screenshot](https://picsum.photos/seed/appscreen/800/500)
{% /showcase %}

{% /preview %}

Bleed directions: `top`, `bottom`, or `both`. The offset distance defaults to `2rem` and can be customised with the `offset` attribute.

## Aspect ratio

Enforce a uniform aspect ratio on the viewport. Content is cropped to fit using `object-fit: cover`.

{% preview source=true %}

{% showcase aspect="16/9" shadow="soft" %}
![Landscape](https://picsum.photos/seed/landscape/800/600)
{% /showcase %}

{% /preview %}

## Combined

Attributes can be combined freely.

{% preview source=true %}

{% showcase shadow="elevated" bleed="both" aspect="16/9" %}
![Hero image](https://picsum.photos/seed/heroimg/800/500)
{% /showcase %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `shadow` | `string` | `none` | Shadow intensity: `none`, `soft`, `hard`, or `elevated` |
| `bleed` | `string` | `none` | Extend beyond container: `none`, `top`, `bottom`, or `both` |
| `offset` | `string` | — | Bleed distance as a CSS value (e.g., `3rem`, `40px`) |
| `aspect` | `string` | — | Aspect ratio for the viewport (e.g., `16/9`, `4/3`, `1/1`) |

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
