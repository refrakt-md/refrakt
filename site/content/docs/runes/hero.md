---
title: Hero
description: Full-width intro sections for landing pages with background support and action buttons
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Hero

Full-width intro section for the top of a page. Headings and paragraphs become the header, links become action buttons, and code fences become copyable command blocks. The first link is styled as a primary button. For smaller, focused action blocks that can appear anywhere, use [CTA](/docs/runes/cta) instead.

## Basic usage

A centered hero section with headline, description, and action buttons.

{% preview source=true %}

{% hero %}

Whats new [Version 1.0](#)

# Build with refrakt.md

A content framework that turns Markdown into rich, semantic pages. Write standard Markdown — runes decide how it's interpreted.

- [Get started](/docs/getting-started)
- [View on GitHub](https://github.com/refrakt-md/refrakt)
{% /hero %}

{% /preview %}

## With command block

Code fences inside a hero become copyable command blocks — great for install commands on landing pages.

{% preview source=true %}

{% hero %}
# Get started in seconds

Scaffold a project and start writing.

```shell
npm create refrakt
```

- [Documentation](/docs/getting-started)
{% /hero %}

{% /preview %}

## Left-aligned

Use `align="left"` for a more editorial feel.

{% preview source=true %}

{% hero align="left" %}
# Documentation that writes itself

Semantic runes transform your Markdown into structured, accessible content.

- [Quick start](/docs/getting-started)
{% /hero %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `background` | `string` | — | CSS background color |
| `backgroundImage` | `string` | — | Background image URL |
| `align` | `string` | `center` | Content alignment: `left`, `center`, or `right` |

## Section header

Hero supports an optional eyebrow, headline, and blurb above the headline and description. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.
