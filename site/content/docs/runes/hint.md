---
title: Hint
description: Callouts and admonitions for supplementary information
---

# Hint

Callouts and admonitions. Supports four types: `note`, `warning`, `caution`, and `check`.

## Basic usage

Display supplementary information with a visual callout.

{% preview source=true %}

{% hint type="note" %}
This is a note with helpful information.
{% /hint %}

{% /preview %}

## All hint types

Use different types to convey different levels of importance.

{% preview source=true %}

{% hint type="note" %}
This is a **note** — useful for supplementary information.
{% /hint %}

{% hint type="warning" %}
This is a **warning** — something to be careful about.
{% /hint %}

{% hint type="caution" %}
This is a **caution** — a serious potential issue.
{% /hint %}

{% hint type="check" %}
This is a **check** — a success or completion message.
{% /hint %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `"note"` | One of `note`, `warning`, `caution`, `check` |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
