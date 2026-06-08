---
title: Hero
description: Full-width intro sections for landing pages with background support and action buttons
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Hero

Full-width intro section for the top of a page. Headings and paragraphs become the header, links become action buttons, and code fences become copyable command blocks. The first link is styled as a primary button. For smaller, focused action blocks that can appear anywhere, use [CTA](/runes/marketing/cta) instead.

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
| `align` | `string` | `center` | Horizontal alignment of headline + body text: `left`, `center`, `right` |

## Section header

Hero supports an optional eyebrow, headline, and blurb above the headline and description. Place a short paragraph or heading before the main content to use them. See [Page sections](/extend/rune-authoring/page-sections) for the full syntax.

### Layout attributes

The body splits on `---` into **media → content** zones (media-first in source). `media-position` controls visual placement independently of source order — a landing-page hero typically uses `media-position="end"` to put the screenshot on the right.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `media-position` | `string` | `top` | Where the media sits: `top`, `bottom`, `start` (left), `end` (right) |
| `media-ratio` | `string` | — | Media's share of the row when beside content (`start`/`end`): `1/3`, `2/5`, `1/2`, `3/5`, `2/3` |
| `valign` | `string` | — | Cross-axis alignment when media is beside content: `top`, `center`, `bottom`, `stretch` |
| `collapse` | `string` | — | Breakpoint at which beside layouts collapse to a stack: `sm`, `md`, `lg`, `never` |

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
