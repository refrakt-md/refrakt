---
title: Annotate
description: Content with margin annotations and notes
---

# Annotate

Annotated content with margin notes. Regular content flows normally while nested note tags appear as annotations alongside the text.

## Margin notes

Notes float in the right margin next to the content they annotate.

{% preview source=true %}

{% annotate %}
The refrakt.md framework builds on Markdoc to provide a semantic content transformation pipeline. Authors write standard Markdown with lightweight tag annotations, and the framework handles the rest — parsing, transforming, and rendering into structured, themed HTML.

{% note %}
Markdoc is an open-source Markdown-based authoring system created by Stripe. It extends Markdown with a custom tag syntax that enables structured content without sacrificing readability.
{% /note %}

Runes are the core abstraction — they wrap ordinary Markdown and reinterpret it based on context. A heading inside a nav rune becomes a group title; a list inside a recipe rune becomes ingredients. The same primitives take on different meaning depending on which rune contains them.
{% /annotate %}

{% /preview %}

## Inline notes

Use `variant="inline"` to show annotations as highlighted blocks within the flow.

{% preview source=true %}

{% annotate variant="inline" %}
Runes use standard Markdoc tag syntax.

{% note %}
This means any Markdoc-compatible editor will understand them.
{% /note %}

The content inside a rune is regular Markdown.
{% /annotate %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `string` | `margin` | Display variant: `margin`, `tooltip`, `inline` |

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
