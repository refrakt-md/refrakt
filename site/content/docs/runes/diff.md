---
title: Diff
description: Side-by-side or unified diff view between two code blocks
---

# Diff

Renders the difference between two code blocks. The first code block is the "before" state, the second is the "after" state.

````markdoc
{% diff mode="unified" %}
```javascript
const x = 1;
const y = 2;
```

```javascript
const [x, y] = [1, 2];
```
{% /diff %}
````

### Example

{% diff mode="split" language="javascript" %}
```javascript
function getData() {
  return fetch('/api')
    .then(res => res.json())
    .then(data => data);
}
```

```javascript
async function getData() {
  const res = await fetch('/api');
  return res.json();
}
```
{% /diff %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | `string` | `unified` | Display mode: `unified`, `split`, or `inline` |
| `language` | `string` | — | Language for syntax highlighting |
