---
title: Grid
description: Generic grid layout for arranging content in columns
---

# Grid

Generic grid layout. Children separated by horizontal rules (`---`) are arranged in a responsive CSS grid.

```markdown
{% grid %}
Column one content.

---

Column two content.

---

Column three content.
{% /grid %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | — | Number of grid columns |
| `rows` | `number` | — | Number of grid rows |
| `flow` | `string` | — | Grid flow: `row`, `column`, `dense`, `row dense`, `column dense` |
| `layout` | `string` | — | Space-separated column span values (e.g., `"2 1"` for a 2:1 split) |
