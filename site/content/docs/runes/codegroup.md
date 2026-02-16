---
title: Codegroup
description: Tabbed code block with language tabs
---

# Codegroup

Display multiple code blocks in a tabbed view. Each fenced code block becomes a tab, with the language automatically detected as the tab name.

## Basic usage

Just add code fences inside a codegroup. The language from each fence becomes the tab label.

````markdoc
{% codegroup %}
```js
const greeting = 'Hello, world!';
console.log(greeting);
```

```python
greeting = "Hello, world!"
print(greeting)
```

```ruby
greeting = "Hello, world!"
puts greeting
```
{% /codegroup %}
````

{% codegroup %}
```js
const greeting = 'Hello, world!';
console.log(greeting);
```

```python
greeting = "Hello, world!"
print(greeting)
```

```ruby
greeting = "Hello, world!"
puts greeting
```
{% /codegroup %}

## Custom labels

When multiple fences share the same language, use `labels` to give each tab a custom name.

````markdoc
{% codegroup labels="React, Vue, Svelte" %}
```js
function App() {
  return <h1>Hello</h1>;
}
```

```js
export default {
  template: '<h1>Hello</h1>'
}
```

```js
<h1>Hello</h1>
```
{% /codegroup %}
````

{% codegroup labels="React, Vue, Svelte" %}
```js
function App() {
  return <h1>Hello</h1>;
}
```

```js
export default {
  template: '<h1>Hello</h1>'
}
```

```js
<h1>Hello</h1>
```
{% /codegroup %}

## With title

Use `title` to display a filename or label in the topbar alongside the window dots.

````markdoc
{% codegroup title="package.json" %}
```json
{
  "name": "my-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```
{% /codegroup %}
````

{% codegroup title="package.json" %}
```json
{
  "name": "my-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```
{% /codegroup %}

## Single code block

A codegroup with one fence still applies the styled code block chrome (topbar with window dots).

````markdoc
{% codegroup %}
```bash
npm install @refrakt-md/core
```
{% /codegroup %}
````

{% codegroup %}
```bash
npm install @refrakt-md/core
```
{% /codegroup %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `labels` | `string` | — | Comma-separated custom tab names |
| `title` | `string` | — | Filename or label shown in the topbar |
