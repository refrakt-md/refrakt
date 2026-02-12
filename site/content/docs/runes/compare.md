---
title: Compare
description: Side-by-side code comparison panels
---

# Compare

Side-by-side code comparison. Each fenced code block becomes a labeled panel. Labels default to the code block's language.

````markdoc
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
````

### Example

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

### Custom labels

Use the `labels` attribute to override the default language-based labels:

````markdoc
{% compare labels="Before, After" %}
```javascript
const data = fetch('/api').then(r => r.json());
```

```javascript
const data = await fetch('/api').then(r => r.json());
```
{% /compare %}
````

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `side-by-side` | Display layout: `side-by-side` or `stacked` |
| `labels` | `string` | — | Comma-separated custom labels for each panel |
