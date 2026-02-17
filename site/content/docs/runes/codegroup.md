---
title: Codegroup
description: Tabbed code block with language tabs
---

# Codegroup

Display multiple code blocks in a tabbed view. Each fenced code block becomes a tab, with the language automatically used as the tab name.

## Basic usage

Tabs are automatically labeled by their code block language.

````markdoc
{% codegroup %}
```js
const x = 1;
```

```python
x = 1
```
{% /codegroup %}
````

{% preview %}

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

````markdoc
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
````

{% preview %}

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

Use the `title` attribute to display a filename or label in the topbar.

````markdoc
{% codegroup title="app.js" %}
```js
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});
```
{% /codegroup %}
````

{% preview %}

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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `labels` | `string` | — | Comma-separated custom tab names |
| `title` | `string` | — | Filename or label shown in the topbar |
