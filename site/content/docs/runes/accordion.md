---
title: Accordion
description: Collapsible accordion sections for FAQ-style content
---

# Accordion

Collapsible accordion sections. Use explicit `{% accordion-item %}` tags, or set `headingLevel` to automatically convert headings into accordion panels.

## Basic usage

Wrap each section in an `{% accordion-item %}` tag with a name.

{% preview source=true %}

{% accordion %}
{% accordion-item name="What is refrakt.md?" %}
A content framework built on Markdoc that extends Markdown with semantic runes. You write standard Markdown — runes decide how it's interpreted.
{% /accordion-item %}

{% accordion-item name="How do runes work?" %}
Runes are Markdoc tags that wrap ordinary Markdown. The same list renders as navigation links, a feature grid, or action buttons — depending on which rune contains it.
{% /accordion-item %}

{% accordion-item name="Do I need to learn a new syntax?" %}
No. Runes use standard Markdoc tag syntax, and the content inside is regular Markdown.
{% /accordion-item %}
{% /accordion %}

{% /preview %}

## Heading conversion

Use `headingLevel` to automatically convert headings into accordion items — no explicit tags needed.

{% preview source=true %}

{% accordion headingLevel=2 %}
## What is refrakt.md?

A content framework built on Markdoc.

## How do runes work?

Runes create interpretation contexts for Markdown content.
{% /accordion %}

{% /preview %}

## Section header

Accordion supports an optional eyebrow, headline, and blurb above the panels. Place a short paragraph or heading before your content heading to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Convert headings at this level into accordion items |
| `multiple` | `boolean` | `true` | Allow multiple panels to be open simultaneously |

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
