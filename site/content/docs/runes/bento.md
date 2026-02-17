---
title: Bento
description: Magazine-style bento grid where heading levels control cell size
---

# Bento

Magazine-style bento grid. Heading levels determine cell size — larger headings get more space.

## Basic usage

Headings split content into grid cells. h2 = large (2x2), h3 = medium (2x1), h4+ = small (1x1).

```markdoc
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
```

{% preview %}

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
