---
title: Feature
description: Feature showcases with name, description, and optional icons
---

# Feature

Feature showcases. List items become feature definitions — bold text is the feature name, the following paragraph is the description.

## Basic usage

A feature grid with named items and descriptions.

```markdoc
{% feature %}
## What you get

- **Semantic runes**

  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

- **Type-safe output**

  Every rune produces typed, validated content that your theme components can rely on.

- **Layout inheritance**

  Define regions once in a parent layout. Child pages inherit and can override with prepend, append, or replace modes.
{% /feature %}
```

{% feature %}
## What you get

- **Semantic runes**

  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

- **Type-safe output**

  Every rune produces typed, validated content that your theme components can rely on.

- **Layout inheritance**

  Define regions once in a parent layout. Child pages inherit and can override with prepend, append, or replace modes.
{% /feature %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `split` | `string` | — | Space-separated column sizes for split layout |
| `mirror` | `boolean` | `false` | Mirror the split layout direction |
