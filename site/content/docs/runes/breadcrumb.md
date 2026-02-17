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
