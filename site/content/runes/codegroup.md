---
title: Codegroup
description: Tabbed code blocks and styled code chrome
---

# Codegroup

Display code blocks with terminal-style chrome. Multiple fences become a tabbed view with language-based tab names. A single fence without labels renders as a clean code block with just the chrome — no tabs.

## Basic usage

Tabs are automatically labeled by their code block language.

{% preview source=true %}

{% codegroup %}
```js
const x = 1;
```

```python
x = 1
```
{% /codegroup %}

{% /preview %}

## Custom labels

Use the `labels` attribute to override the default language-based tab names. Useful when multiple tabs share the same language.

{% preview source=true %}

{% codegroup labels="React, Vue, Svelte" %}
```jsx
export default function App() {
  return <h1>Hello</h1>;
}
```

```html
<template>
  <h1>Hello</h1>
</template>
```

```html
<h1>Hello</h1>
```
{% /codegroup %}

{% /preview %}

## With title

Use the `title` attribute to display a filename or label in the topbar. With a single code fence and no `labels`, the codegroup renders as chrome-only — the topbar and code block without any tabs.

{% preview source=true %}

{% codegroup title="app.js" %}
```js
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});
```
{% /codegroup %}

{% /preview %}

To force a tab bar on a single fence, provide the `labels` attribute.

{% preview source=true %}

{% codegroup title="server" labels="Express" %}
```js
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});
```
{% /codegroup %}

{% /preview %}

## Overflow control

Use the `overflow` attribute to control how long lines are handled. The default is `scroll` (horizontal scrollbar). Use `wrap` to wrap lines, or `hide` to clip without a scrollbar.

{% preview source=true %}

{% codegroup overflow="wrap" title="wrapped.ts" %}
```ts
const result = await fetchUserDataFromRemoteService(userId, { includeMetadata: true, resolveReferences: true, maxDepth: 3, timeout: 5000 });
```
{% /codegroup %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `labels` | `string` | — | Comma-separated custom tab names |
| `title` | `string` | — | Filename or label shown in the topbar |
| `overflow` | `string` | `scroll` | Line overflow: `scroll`, `wrap`, or `hide` |

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
