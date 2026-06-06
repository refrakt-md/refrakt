---
title: Bento
description: Magazine-style bento grid of cells — heading depth sizes each tile, or author cells explicitly for full control
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Bento

A grid of cells. Each cell is a small card living in a grid track. There are two ways to author one — **heading sugar** (each heading becomes a cell, its depth setting the tile size) or **explicit cells** (`{% bento-cell %}` for precise per-tile control). Bento is a grid primitive, not a page-section: it has no eyebrow/title/blurb header. To title a grid, wrap it in a `feature` or section.

## Heading sugar

Each heading becomes a cell; the heading itself is the cell title. The base level is **h2**: h2 → large, h3 → medium, h4+ → small. Content before the first heading renders loose, above the grid.

{% preview source=true %}

{% bento columns=6 %}
## Featured Article

This cell spans two-thirds of the grid across two rows — the hero of the layout.

### Quick Update

A medium cell, half the grid width.

#### Tip of the Day

Small cells are great for bite-sized content.

#### Did You Know?

Another small cell sits neatly in the grid.
{% /bento %}

{% /preview %}

## Cell sizes

The grid is **6 columns** by default. Size presets resolve as proportions of the column count, so a preset holds its ratio at any `columns`:

| Heading | Size | Span (at 6 cols) | Proportion |
|---------|------|------------------|------------|
| h2 | `large` | 4 cols × 2 rows | ⅔ width, 2 rows |
| h3 | `medium` | 3 cols × 1 row | ½ width |
| h4+ | `small` | 2 cols × 1 row | ⅓ width |
| — | `full` | 6 cols × 1 row | full width |

Rows are uniform fixed-height tracks (themeable via `--rf-bento-row-height`), so a `large` cell is genuinely twice as tall and a tall guest is bounded by its track rather than ballooning the row.

## Media zones

A cell's content splits on a top-level `---` into **media / body / footer** zones, exactly like `card`. The media zone clips and sizes its guest, so any visual rune (chart, map, gallery, mockup, `showcase`) drops in and adapts automatically.

{% preview source=true %}

{% bento columns=6 %}
## Config tile

{% codegroup %}
```yaml title="refrakt.config.ts"
theme: '@refrakt-md/lumina'
```
{% /codegroup %}

---

The fenced block above sits in the cell's media zone; this paragraph is the body.
{% /bento %}

{% /preview %}

The first zone is media, the last (when there are three) is the footer:

```md
{% bento-cell %}
## Title
![cover](cover.png)   <!-- media -->
---
Body copy.            <!-- body -->
---
Footer note.          <!-- footer -->
{% /bento-cell %}
```

`media-position` controls where the media sits relative to the body (`top | bottom | start | end`), with a size-derived default — large/full cells place media **beside** the body, smaller cells stack it **on top**.

## Explicit cells

For full per-tile control (the dashboard case), author `{% bento-cell %}` tags directly. When a bento contains explicit cells, heading sugar is short-circuited — the cells are used as-is. Each cell accepts precise `cols` / `rows` spans, a `size` preset, `media-position`, and an `href` that turns the whole tile into a link.

{% preview source=true %}

{% bento columns=6 %}
{% bento-cell cols=4 rows=2 href="/runes/rune-catalog" %}
## Overview

The hero tile spans four columns and two rows, and the whole cell links out.
{% /bento-cell %}

{% bento-cell cols=2 media-position="end" %}
## Sidebar

A two-column companion tile.
{% /bento-cell %}
{% /bento %}

{% /preview %}

Mixing headings and explicit cells in one grid is not a supported pattern — if any explicit cell is present, loose headings are ignored.

## Responsive collapse

Between the full grid and a single stacked column, the column count steps down automatically and every span auto-caps to the current width, so wide cells degrade gracefully. `collapse` sets the breakpoint at which the grid drops to one column:

```md
{% bento collapse="md" %}
```

| Value | Collapses to one column at |
|-------|----------------------------|
| `sm` | small screens (early) |
| `md` | medium screens |
| `lg` | large screens (late) |
| `never` | never fully collapses |

## Attributes

### `bento`

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | `6` | Number of grid columns |
| `gap` | `string` | `1rem` | Grid gap |
| `collapse` | `string` | — | Breakpoint to stack into one column: `sm`, `md`, `lg`, or `never` |

### `bento-cell`

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | `string` | `medium` | Size preset: `small`, `medium`, `large`, or `full` |
| `cols` | `number` | — | Explicit column span (overrides `size` width) |
| `rows` | `number` | — | Explicit row span (overrides `size` height) |
| `media-position` | `string` | size-derived | Media placement: `top`, `bottom`, `start`, or `end` |
| `href` | `string` | — | Makes the whole cell a link |

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

Cells are tint-deferrable: apply `tint` / `tint-mode` to an individual `{% bento-cell %}` for a multi-coloured grid.
