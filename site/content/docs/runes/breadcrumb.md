---
title: Breadcrumb
description: Navigation breadcrumbs showing page hierarchy
---

# Breadcrumb

Navigation breadcrumbs from a list of links. Each linked item is a navigable breadcrumb, and the last item (without a link) represents the current page.

```markdoc
{% breadcrumb %}
- [Home](/)
- [Getting started](/docs/getting-started)
- [Tabs](/docs/runes/tabs)
- Breadcrumb
{% /breadcrumb %}
```

### Example

{% breadcrumb %}
- [Home](/)
- [Getting started](/docs/getting-started)
- [Tabs](/docs/runes/tabs)
- Breadcrumb
{% /breadcrumb %}

### Custom separator

```markdoc
{% breadcrumb separator="›" %}
- [Home](/)
- [Getting started](/docs/getting-started)
- Current page
{% /breadcrumb %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `separator` | `string` | `'/'` | Character displayed between breadcrumb items |
