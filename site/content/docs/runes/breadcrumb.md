---
title: Breadcrumb
description: Navigation breadcrumbs showing page hierarchy
---

# Breadcrumb

Navigation breadcrumbs from a list of links. Each linked item is a navigable breadcrumb, and the last item (without a link) represents the current page.

## Basic usage

A breadcrumb trail using the default `/` separator.

{% preview source=true %}

{% breadcrumb %}
- [Home](/)
- [Getting started](/docs/getting-started)
- [Tabs](/docs/runes/tabs)
- Breadcrumb
{% /breadcrumb %}

{% /preview %}

## Custom separator

Use the `separator` attribute to change the divider between items.

{% preview source=true %}

{% breadcrumb separator="›" %}
- [Home](/)
- [Getting started](/docs/getting-started)
- Current page
{% /breadcrumb %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `separator` | `string` | `'/'` | Character displayed between breadcrumb items |

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
