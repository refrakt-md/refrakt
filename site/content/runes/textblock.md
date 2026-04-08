---
title: TextBlock
description: Styled text blocks with drop caps, columns, and lead paragraphs
---

# TextBlock

Typography-focused text wrapper for magazine-style layouts. Adds drop caps, multi-column text, lead paragraph styling, and text alignment without any custom markup inside the content.

## Drop cap

The `dropcap` attribute adds a large decorative first letter for an editorial feel.

{% preview source=true %}

{% textblock dropcap=true %}
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
{% /textblock %}

{% /preview %}

## Multi-column layout

Use the `columns` attribute for newspaper-style column layouts.

{% preview source=true %}

{% textblock columns=2 %}
The invention of the printing press in the 15th century revolutionized the spread of information across Europe. Before Gutenberg, books were painstakingly copied by hand, making them rare and expensive.

With movable type, ideas could be reproduced quickly and cheaply. This democratization of knowledge helped fuel the Renaissance, the Reformation, and the Scientific Revolution.
{% /textblock %}

{% /preview %}

## Lead paragraphs

The `lead` attribute styles the text as a larger introductory paragraph.

{% preview source=true %}

{% textblock lead=true %}
This is the opening paragraph of the article, styled with larger text and heavier weight to draw the reader in.
{% /textblock %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `dropcap` | `boolean` | `false` | Enable drop cap styling on the first letter |
| `columns` | `number` | `1` | Number of text columns (values greater than 1 trigger column layout) |
| `lead` | `boolean` | `false` | Display as a lead paragraph with larger, bolder text |
| `align` | `string` | `left` | Text alignment: `left`, `center`, `right`, or `justify` |

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
