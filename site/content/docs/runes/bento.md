---
title: Bento
description: Magazine-style bento grid where heading levels control cell size
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Bento

Magazine-style bento grid. Heading levels determine cell size — larger headings get more space.

## Basic usage

Headings split content into grid cells. h2 = large (2x2), h3 = medium (2x1), h4+ = small (1x1).

{% preview source=true %}

{% bento headingLevel=2 columns=4 %}
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
| `headingLevel` | `number` | `2` | Base heading level for cells |
| `columns` | `number` | `4` | Number of grid columns |
| `gap` | `string` | `1rem` | Grid gap |

## Section header

Bento supports an optional eyebrow, headline, and blurb above the section above the grid. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
