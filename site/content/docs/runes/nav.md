---
title: Nav
description: Navigation structure for sidebar and site navigation
---

# Nav

Navigation structure for the sidebar. Headings become group titles, list items become page links using slugs that resolve to page titles.

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

### How slugs resolve

Each list item is a slug (e.g., `getting-started`). The nav component matches it against page URLs — if a page exists at `/docs/getting-started`, the slug resolves and the page's `title` frontmatter is used as the link text.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `ordered` | `boolean` | `false` | Use ordered list styling |
