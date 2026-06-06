---
title: Bento
description: Magazine-style bento grid where heading levels control cell size
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Bento

Magazine-style bento grid. Heading levels determine cell size — larger headings get more space.

## Basic usage

Headings split content into grid cells. The base level is always h2: h2 = large (2x2), h3 = medium (2x1), h4+ = small (1x1).

{% preview source=true %}

{% bento columns=4 %}
## Featured Article

This cell spans 2 columns and 2 rows, making it the hero of the grid.

### Quick Update

A medium cell spanning 2 columns.

#### Tip of the Day

Small cells are great for bite-sized content.

#### Did You Know?

Another small cell sits neatly in the grid.
{% /bento %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | `4` | Number of grid columns |
| `gap` | `string` | `1rem` | Grid gap |

## Cell sizes

In tiered mode, heading levels map to cell sizes:

| Heading | Size | Span |
|---------|------|------|
| h2 | `large` | 2 columns + 2 rows |
| h3 | `medium` | 2 columns |
| h4+ | `small` | 1 column |

## Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
