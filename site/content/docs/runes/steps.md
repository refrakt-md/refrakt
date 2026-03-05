---
title: Steps
description: Step-by-step instructions with numbered indicators
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Steps

Step-by-step instructions with numbered indicators. Ordered list items become individual steps.

## Basic usage

Each ordered list item becomes a numbered step.

{% preview source=true %}

{% steps %}
1. Install the dependencies

   Run the install command for your package manager.

2. Create your content directory

   Add a `content/` folder with your Markdown files.

3. Start the dev server

   Run `npm run dev` and visit localhost.
{% /steps %}

{% /preview %}

## Heading-based steps

Use `headingLevel` to convert headings into steps instead of list items.

{% preview source=true %}

{% steps headingLevel=3 %}
### Clone the repository

Fork and clone the repo to your local machine.

### Install dependencies

Run `npm install` to set up all packages.

### Run the tests

Verify everything works with `npm test`.
{% /steps %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Convert headings at this level into steps |

### Step attributes

Individual steps (list items or heading-delimited blocks) accept these layout attributes.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `stacked` | Layout mode: `stacked`, `split`, or `split-reverse` |
| `ratio` | `string` | `1 1` | Column width ratio in split layout (e.g., `2 1`, `1 2`) |
| `align` | `string` | `start` | Vertical alignment in split layout: `start`, `center`, or `end` |
| `gap` | `string` | `default` | Gap between columns: `none`, `tight`, `default`, or `loose` |
| `collapse` | `string` | — | Collapse to single column at breakpoint: `sm`, `md`, `lg`, or `never` |

## Section header

Steps supports an optional eyebrow, headline, and blurb above the section above the steps. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
