---
title: Nav
description: Navigation structure for sidebar and site navigation
---

# Nav

Navigation structure for the sidebar. Headings become group titles, list items become page links using slugs that resolve to page titles.

## Basic usage

Define navigation groups with headings and page slugs as list items.

```markdoc
{% nav %}
## Getting Started
- getting-started
- runes

## Advanced
- layouts
- theming
{% /nav %}
```

Place inside a `{% region name="nav" %}` in your `_layout.md` to create a site-wide sidebar.

Each list item is a slug (e.g., `getting-started`). The nav component matches it against page URLs — if a page exists at `/docs/getting-started`, the slug resolves and the page's `title` frontmatter is used as the link text.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `ordered` | `boolean` | `false` | Use ordered list styling |

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
