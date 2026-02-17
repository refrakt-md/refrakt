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

## With heading and description

Add a paragraph after the heading to introduce the feature set.

```markdoc
{% feature %}
## Built for content teams

Refrakt gives you the building blocks to ship structured content sites without fighting your framework.

- **Semantic runes**

  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

- **Type-safe output**

  Every rune produces typed, validated content that your theme components can rely on.
{% /feature %}
```

{% feature %}
## Built for content teams

Refrakt gives you the building blocks to ship structured content sites without fighting your framework.

- **Semantic runes**

  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

- **Type-safe output**

  Every rune produces typed, validated content that your theme components can rely on.
{% /feature %}

## Split layout

Use `split` to place definitions alongside a showcase — an image, code block, or any other content. A horizontal rule (`---`) separates the two sections.

````markdoc
{% feature split=true %}
## Why Refrakt

- **Zero config**

  Drop Markdown files into your content directory. Routing, layouts, and type generation happen automatically.

- **Framework agnostic**

  The identity transform is pure data. Render with Svelte, React, or anything else.

---

{% codegroup %}
```yaml title="refrakt.config.ts"
export default {
  content: './content',
  theme: '@refrakt-md/lumina'
}
```

```md title="content/index.md"
---
title: Home
---

{% hero %}
# Welcome
{% /hero %}
```
{% /codegroup %}
{% /feature %}
````

{% feature split=true %}
## Why Refrakt

- **Zero config**

  Drop Markdown files into your content directory. Routing, layouts, and type generation happen automatically.

- **Framework agnostic**

  The identity transform is pure data. Render with Svelte, React, or anything else.

---

{% codegroup %}
```yaml title="refrakt.config.ts"
export default {
  content: './content',
  theme: '@refrakt-md/lumina'
}
```

```md title="content/index.md"
---
title: Home
---

{% hero %}
# Welcome
{% /hero %}
```
{% /codegroup %}
{% /feature %}

## Split with mirror

Add `mirror` to swap the column order — showcase on the left, definitions on the right.

````markdoc
{% feature split=true mirror=true %}
## How it works

- **Parse**

  Markdoc turns your Markdown into an AST.

- **Transform**

  Rune schemas reinterpret the AST nodes based on context.

- **Render**

  The identity transform adds BEM classes and structural elements. Your theme takes it from there.

---

{% codegroup %}
```ts title="transform.ts"
const ast = Markdoc.parse(content);
const tree = Markdoc.transform(ast, {
  tags,
  nodes
});
```

```html title="output.html"
<section class="rf-hero">
  <header class="rf-hero__body">
    <h1>Welcome</h1>
  </header>
</section>
```
{% /codegroup %}
{% /feature %}
````

{% feature split=true mirror=true %}
## How it works

- **Parse**

  Markdoc turns your Markdown into an AST.

- **Transform**

  Rune schemas reinterpret the AST nodes based on context.

- **Render**

  The identity transform adds BEM classes and structural elements. Your theme takes it from there.

---

{% codegroup %}
```ts title="transform.ts"
const ast = Markdoc.parse(content);
const tree = Markdoc.transform(ast, {
  tags,
  nodes
});
```

```html title="output.html"
<section class="rf-hero">
  <header class="rf-hero__body">
    <h1>Welcome</h1>
  </header>
</section>
```
{% /codegroup %}
{% /feature %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `split` | `boolean` | `false` | Enable two-column split layout |
| `mirror` | `boolean` | `false` | Swap the column order |
