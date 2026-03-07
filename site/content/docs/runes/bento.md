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
| `sizing` | `string` | `tiered` | Size mode: `tiered` (named sizes) or `span` (heading level = column span) |

## Full-width cells with h1

Set `headingLevel=1` to use all six heading levels. In tiered mode, h1 creates a **full-width** cell that stretches across the entire grid.

| Heading | Size | Span |
|---------|------|------|
| h1 | `full` | all columns |
| h2 | `large` | 2 columns + 2 rows |
| h3 | `medium` | 2 columns |
| h4+ | `small` | 1 column |

{% preview source=true %}

{% bento headingLevel=1 columns=4 %}
# Announcement Banner

This full-width cell stretches across the entire grid — great for hero content.

## Featured Article

A large cell with more visual weight.

### Quick Update

A medium cell spanning 2 columns.

#### Detail

A small 1-column cell.
{% /bento %}

{% /preview %}

## Span mode

Set `sizing="span"` to map heading levels directly to column spans. The column span is the inverse of the heading level: h1 spans the most columns, h6 spans 1. Defaults to a 6-column grid so every heading level gets a distinct span.

| Heading | Span (6-col grid) |
|---------|--------------------|
| h1 | 6 columns |
| h2 | 5 columns |
| h3 | 4 columns |
| h4 | 3 columns |
| h5 | 2 columns |
| h6 | 1 column |

The formula is `columns + 1 - level`, clamped to `[1, columns]`. Custom column counts adjust the spans proportionally.

{% preview source=true %}

{% bento sizing="span" headingLevel=1 %}
# Hero Feature

Stretches across all 6 columns.

## Key Highlight

Five columns of prominence.

### Section

Four columns wide.

#### Detail

Three columns.

##### Note

Two columns.

###### Tag

One column.
{% /bento %}

{% /preview %}

## Section header

Bento supports an optional eyebrow, headline, and blurb above the section above the grid. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

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
