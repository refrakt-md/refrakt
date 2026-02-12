---
title: Hero
description: Large hero sections for landing pages
---

# Hero

Large hero sections for landing pages. Headings and paragraphs become the header, and a list of links becomes action buttons. The first link is styled as a primary button.

## Basic usage

A centered hero section with headline, description, and action buttons.

```markdoc
{% hero %}
# Build with refrakt.md

A content framework that turns Markdown into rich, semantic pages. Write standard Markdown — runes decide how it's interpreted.

- [Get started](/docs/getting-started)
- [View on GitHub](https://github.com/refrakt-md/refrakt)
{% /hero %}
```

{% hero %}
# Build with refrakt.md

A content framework that turns Markdown into rich, semantic pages. Write standard Markdown — runes decide how it's interpreted.

- [Get started](/docs/getting-started)
- [View on GitHub](https://github.com/refrakt-md/refrakt)
{% /hero %}

## Left-aligned

Use `align="left"` for a more editorial feel.

```markdoc
{% hero align="left" %}
# Documentation that writes itself

Semantic runes transform your Markdown into structured, accessible content.

- [Quick start](/docs/getting-started)
{% /hero %}
```

{% hero align="left" %}
# Documentation that writes itself

Semantic runes transform your Markdown into structured, accessible content.

- [Quick start](/docs/getting-started)
{% /hero %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `background` | `string` | — | CSS background color |
| `backgroundImage` | `string` | — | Background image URL |
| `align` | `string` | `center` | Content alignment: `left`, `center`, or `right` |
