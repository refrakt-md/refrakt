---
title: Compare
description: Side-by-side code comparison panels
---

# Compare

Side-by-side code comparison. Each fenced code block becomes a labeled panel. Labels default to the code block's language.

## Basic usage

Panels are automatically labeled by their code block language.

{% preview source=true %}

{% compare %}
```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
{% /compare %}

{% /preview %}

## Custom labels

Use the `labels` attribute to override the default language-based labels.

{% preview source=true %}

{% compare labels="Before, After" %}
```javascript
const data = fetch('/api').then(r => r.json());
```

```javascript
const data = await fetch('/api').then(r => r.json());
```
{% /compare %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `side-by-side` | Display layout: `side-by-side` or `stacked` |
| `labels` | `string` | — | Comma-separated custom labels for each panel |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
