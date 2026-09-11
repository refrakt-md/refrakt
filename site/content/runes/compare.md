---
title: Compare
description: Side-by-side code comparison panels
category: "Code & Data"
plugin: core
status: stable
type: rune
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

{% include file="rune-attributes.md" variables={r: "rune:compare"} /%}

