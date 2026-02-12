---
title: Layout & Region
description: Structural runes for defining page layouts and named content regions
---

# Layout & Region

Structural runes that define page layout. `{% layout %}` wraps the entire layout file. `{% region %}` defines named content areas (header, nav, sidebar, footer) that render in specific positions within the theme's layout component.

## Defining regions

A `_layout.md` file uses regions to place content into theme slots.

```markdoc
{% layout %}
{% region name="header" %}
# Site Title
{% /region %}

{% region name="nav" %}
{% nav %}
- page-one
- page-two
{% /nav %}
{% /region %}
{% /layout %}
```

Layouts are inherited from parent directories. A `_layout.md` in a subdirectory can override or extend regions from the parent layout using the `mode` attribute.

### Region attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | **required** | Region identifier (e.g., `header`, `nav`, `sidebar`, `footer`) |
| `mode` | `string` | `"replace"` | Merge mode: `replace`, `prepend`, or `append` |

### Layout attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `extends` | `string` | `"parent"` | Which layout to extend |
