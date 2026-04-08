---
title: Sidenote
description: Margin notes and footnotes alongside main content
---

# Sidenote

Margin notes, footnotes, or tooltips displayed alongside the main content. Useful for providing additional context without interrupting the reading flow.

## Basic usage

A margin note that sits alongside the main text.

{% preview source=true %}

{% sidenote variant="sidenote" %}
This is a margin note that provides additional context without interrupting the main flow of the text. It can contain **rich formatting** and [links](/docs/getting-started).
{% /sidenote %}

{% /preview %}

## Footnote style

Use `variant="footnote"` for content that appears at the bottom of the section.

{% preview source=true %}

{% sidenote variant="footnote" %}
This appears as a footnote, typically rendered at the bottom of the content section with a separator line.
{% /sidenote %}

{% /preview %}

## Tooltip style

Use `variant="tooltip"` for a subtle inline callout.

{% preview source=true %}

{% sidenote variant="tooltip" %}
This appears as a tooltip-style callout with a subtle border and background.
{% /sidenote %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `string` | `sidenote` | Display variant: `sidenote`, `footnote`, or `tooltip` |

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
