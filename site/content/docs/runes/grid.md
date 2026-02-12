---
title: Grid
description: Generic grid layout for arranging content in columns
---

# Grid

Generic grid layout. Children separated by horizontal rules (`---`) are arranged in a responsive CSS grid.

## Basic usage

Equal columns created by separating content with horizontal rules.

```markdoc
{% grid %}
**First column.** This content sits in the first cell of the grid layout.

---

**Second column.** Grid cells are separated by horizontal rules in the Markdown source.

---

**Third column.** The grid automatically distributes available space across columns.
{% /grid %}
```

{% grid %}
**First column.** This content sits in the first cell of the grid layout.

---

**Second column.** Grid cells are separated by horizontal rules in the Markdown source.

---

**Third column.** The grid automatically distributes available space across columns.
{% /grid %}

## Unequal columns

Use the `layout` attribute to control column spans. Values are space-separated span widths.

```markdoc
{% grid layout="2 1" %}
**Wide column.** This column spans two units of the grid, taking up twice the space of the narrow column beside it.

---

**Narrow column.** This column takes one unit.
{% /grid %}
```

{% grid layout="2 1" %}
**Wide column.** This column spans two units of the grid, taking up twice the space of the narrow column beside it.

---

**Narrow column.** This column takes one unit.
{% /grid %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | — | Number of grid columns |
| `rows` | `number` | — | Number of grid rows |
| `flow` | `string` | — | Grid flow: `row`, `column`, `dense`, `row dense`, `column dense` |
| `layout` | `string` | — | Space-separated column span values (e.g., `"2 1"` for a 2:1 split) |
