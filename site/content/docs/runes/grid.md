---
title: Grid
description: Flexible grid layout with columns, auto-fill, masonry, and responsive collapse
---

# Grid

Flexible grid layout. Children separated by horizontal rules (`---`) become cells arranged in a responsive CSS grid. Supports explicit column spans, auto-fill mode, masonry, aspect ratio enforcement, and responsive collapse.

## Basic usage

Equal columns created by separating content with horizontal rules.

{% preview source=true %}

{% grid %}
**First column.** This content sits in the first cell of the grid layout.

---

**Second column.** Grid cells are separated by horizontal rules in the Markdown source.

---

**Third column.** The grid automatically distributes available space across columns.
{% /grid %}

{% /preview %}

## Unequal columns

Use the `spans` attribute to control column widths. Values are space-separated span sizes.

{% preview source=true %}

{% grid spans="2 1" %}
**Wide column.** This column spans two units of the grid, taking up twice the space of the narrow column beside it.

---

**Narrow column.** This column takes one unit.
{% /grid %}

{% /preview %}

## Gap

Control spacing between cells with the `gap` attribute.

{% preview source=true %}

{% grid gap="tight" %}
**Tight gap.** Less space between cells.

---

**Second cell.** The gap is smaller than default.

---

**Third cell.** Useful for compact layouts.
{% /grid %}

{% /preview %}

## Alignment

Vertically align cells within their row using the `align` attribute. Useful when cells have different heights.

{% preview source=true %}

{% grid align="center" spans="2 1" %}
**Tall cell.** This cell has more content and takes up more vertical space. The adjacent cell will be vertically centred relative to this one.

Additional paragraph to increase the height of this cell.

---

**Centred.** This shorter cell is vertically centred.
{% /grid %}

{% /preview %}

## Responsive collapse

Force the grid to collapse to a single column at a given breakpoint.

```markdoc
{% grid collapse="md" %}
Sidebar content.

---

Main content.
{% /grid %}
```

Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), or `never`.

## Auto mode

Responsive auto-fill layout. The grid creates as many columns as fit, each at least `min` wide. No explicit column count needed.

{% preview source=true %}

{% grid mode="auto" min="200px" %}
Card one.

---

Card two.

---

Card three.

---

Card four.
{% /grid %}

{% /preview %}

## Masonry mode

Progressive enhancement for masonry-style layouts. Falls back to a standard grid in browsers that don't support CSS masonry.

```markdoc
{% grid mode="masonry" columns=3 %}
Short card.

---

A taller card with more content that takes up more vertical space.

---

Medium card.

---

Another short one.
{% /grid %}
```

## Aspect ratio

Enforce a uniform aspect ratio on all grid cells. Content is cropped with `object-fit: cover` — ideal for image galleries.

{% preview source=true %}

{% grid mode="auto" min="200px" aspect="1/1" %}
![](https://picsum.photos/seed/grid1/400/400)

---

![](https://picsum.photos/seed/grid2/400/400)

---

![](https://picsum.photos/seed/grid3/400/400)

---

![](https://picsum.photos/seed/grid4/400/400)
{% /grid %}

{% /preview %}

## Stack order

Control the order of cells when the grid collapses to a single column on mobile. By default cells stack in source order; `stack="reverse"` places the last cell first.

```markdoc
{% grid spans="2 1" collapse="md" stack="reverse" %}
Main content (appears second on mobile).

---

Sidebar (appears first on mobile).
{% /grid %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | — | Fixed number of grid columns |
| `rows` | `number` | — | Fixed number of grid rows |
| `flow` | `string` | — | Grid flow: `row`, `column`, `dense`, `row dense`, `column dense` |
| `spans` | `string` | — | Space-separated column span values (e.g., `"2 1"`) |
| `ratio` | `string` | — | Column width ratio as CSS grid-template-columns value |
| `gap` | `string` | `default` | Gap between cells: `none`, `tight`, `default`, or `loose` |
| `align` | `string` | — | Vertical cell alignment: `start`, `center`, or `end` |
| `collapse` | `string` | — | Collapse to single column at breakpoint: `sm`, `md`, `lg`, or `never` |
| `mode` | `string` | `columns` | Layout mode: `columns`, `auto`, or `masonry` |
| `min` | `string` | `250px` | Minimum column width in auto mode (e.g., `200px`, `15rem`) |
| `aspect` | `string` | — | Aspect ratio enforced on all cells (e.g., `16/9`, `1/1`) |
| `stack` | `string` | — | Cell order when collapsed: `natural` or `reverse` |

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
