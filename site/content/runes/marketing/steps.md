---
title: Steps
description: Step-by-step instructions with numbered indicators
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
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

Headings are automatically converted into steps instead of list items.

{% preview source=true %}

{% steps %}
### Clone the repository

Fork and clone the repo to your local machine.

### Install dependencies

Run `npm install` to set up all packages.

### Run the tests

Verify everything works with `npm test`.
{% /steps %}

{% /preview %}

### Step layout attributes

Individual steps (heading-delimited blocks) accept the shared media+content layout vocabulary — the body splits on `---` into **media → content** zones (media-first in source); `media-position` controls visual placement.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `media-position` | `string` | `bottom` | Where the media sits: `top`, `bottom` (the default — media beneath the text), `start` (left), `end` (right) |
| `media-ratio` | `string` | — | Media's share of the row when beside content (`start`/`end`): `1/3`, `2/5`, `1/2`, `3/5`, `2/3` |
| `valign` | `string` | — | Cross-axis alignment when media is beside content: `top`, `center`, `bottom`, `stretch` |
| `collapse` | `string` | — | Breakpoint at which beside layouts collapse to a stack: `sm`, `md`, `lg`, `never` |

## Section header

Steps supports an optional eyebrow, headline, and blurb above the section above the steps. Place a short paragraph or heading before the main content to use them. See [Page sections](/extend/rune-authoring/page-sections) for the full syntax.

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
