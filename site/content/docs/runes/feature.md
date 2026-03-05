---
title: Feature
description: Feature showcases with name, description, and optional icons
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Feature

Feature showcases. List items become feature definitions — bold text is the feature name, the following paragraph is the description.

## Basic usage

A feature grid with named items and descriptions.

{% preview source=true %}

{% feature %}
what you get

## Structured data

- **Semantic runes**

  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

- **Type-safe output**

  Every rune produces typed, validated content that your theme components can rely on.

- **Layout inheritance**

  Define regions once in a parent layout. Child pages inherit and can override with prepend, append, or replace modes.
{% /feature %}

{% /preview %}

## With heading and description

Add a paragraph after the heading to introduce the feature set.

{% preview source=true %}

{% feature %}
what you get
## Built for content teams

Refrakt gives you the building blocks to ship structured content sites without fighting your framework.

- **Semantic runes**

  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

- **Type-safe output**

  Every rune produces typed, validated content that your theme components can rely on.
{% /feature %}

{% /preview %}

## Split layout

Use `layout="split"` to place definitions alongside a media column — an image, code block, or any other content. A horizontal rule (`---`) separates the two sections.

{% preview source=true %}

{% feature layout="split" %}
why Refrakt

## Built for versatility

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

{% /preview %}

## Split reversed

Use `layout="split-reverse"` to swap the column order — media on the left, definitions on the right.

{% preview source=true %}

{% feature layout="split-reverse" %}
pipeline
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

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | `string` | `stacked` | Layout mode: `stacked`, `split`, or `split-reverse` |
| `justify` | `string` | `center` | Content alignment: `left`, `center`, or `right` |
| `ratio` | `string` | `1 1` | Column width ratio in split layout (e.g., `2 1`, `1 2`) |
| `align` | `string` | `start` | Vertical alignment in split layout: `start`, `center`, or `end` |
| `gap` | `string` | `default` | Gap between columns: `none`, `tight`, `default`, or `loose` |
| `collapse` | `string` | — | Collapse to single column at breakpoint: `sm`, `md`, `lg`, or `never` |

## Section header

Feature supports an optional eyebrow, headline, and blurb above the section above feature items. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
