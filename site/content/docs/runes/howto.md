---
title: HowTo
description: Step-by-step how-to guide with tools and instructions
---

{% hint type="note" %}
This rune is part of **@refrakt-md/learning**. Install with `npm install @refrakt-md/learning` and add `"@refrakt-md/learning"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# HowTo

Step-by-step how-to instructions. Unordered lists become tools/materials needed, ordered lists become steps.

## Basic usage

A how-to guide with required tools and numbered steps.

{% preview source=true %}

{% howto estimatedTime="PT1H" difficulty="medium" %}
# How to Set Up a Development Environment

You will need these tools:

- Node.js 18+
- Git
- A code editor (VS Code recommended)

1. Install Node.js from the official website
2. Clone the repository with `git clone`
3. Run `npm install` to install dependencies
4. Start the dev server with `npm run dev`
{% /howto %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `estimatedTime` | `string` | — | Estimated time in ISO 8601 duration (e.g. "PT1H") |
| `difficulty` | `string` | — | Difficulty level: `easy`, `medium`, or `hard` |
| `headingLevel` | `number` | — | Heading level to convert into steps (auto-detected if omitted) |

## Section header

How-to supports an optional eyebrow, headline, and blurb above the section above the steps. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
