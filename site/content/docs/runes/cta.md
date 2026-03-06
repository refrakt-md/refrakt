---
title: CTA
description: Focused call-to-action blocks with headlines, descriptions, and action buttons
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# CTA

A focused call-to-action block. Headings become the headline, paragraphs become the subtitle, and list items with links become action buttons. Code fences become copyable command blocks. Use CTA for action prompts that can appear anywhere on a page — for full-width intro sections, use [Hero](/docs/runes/hero) instead.

## Basic usage

A headline with a description and action buttons.

{% preview source=true %}

{% cta %}
# Get Started with refrakt.md

Build structured content sites with semantic Markdown.

- [Quick Start](/docs/getting-started)
- [View on GitHub](https://github.com)
{% /cta %}

{% /preview %}

## With command block

Code fences inside a CTA become copyable command blocks.

{% preview source=true %}

{% cta %}
# Install refrakt.md

Get up and running in seconds.

```shell
npm install @refrakt-md/runes
```
{% /cta %}

{% /preview %}

## Section header

CTA supports an optional eyebrow, headline, and blurb above the headline and description. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

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
