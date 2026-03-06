---
title: Reveal
description: Progressive disclosure where content appears step by step
---

# Reveal

Progressive disclosure. Headings become reveal steps, with content shown one step at a time.

## Basic usage

Set `headingLevel` to split content into reveal steps at that heading level.

{% preview source=true %}

{% reveal headingLevel=3 %}
### Step 1: Install the package

Run the install command to add refrakt.md to your project.

### Step 2: Configure your theme

Set up the lumina theme in your config file.

### Step 3: Write content

Create Markdown files with runes and watch them transform.
{% /reveal %}

{% /preview %}

## Section header

Reveal supports an optional eyebrow, headline, and blurb above the steps. Place a short paragraph or heading before your step headings to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to split content into steps |
| `mode` | `string` | `click` | Trigger mode: `click`, `scroll`, `auto` |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
