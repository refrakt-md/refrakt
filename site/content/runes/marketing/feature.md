---
title: Feature
description: Feature showcases with name, description, and optional icons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
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

## Media on the right (`end`)

Use `media-position="end"` to place definitions alongside a media column — an image, code block, or any other content. A horizontal rule (`---`) separates the **media** block (first) from the **content** block (second).

{% preview source=true %}

{% feature media-position="end" %}
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

---

why Refrakt

## Built for versatility

- **Zero config**

  Drop Markdown files into your content directory. Routing, layouts, and type generation happen automatically.

- **Framework agnostic**

  The identity transform is pure data. Render with Svelte, React, or anything else.
{% /feature %}

{% /preview %}

## Media on the left (`start`)

Use `media-position="start"` to swap the column order — media on the left, definitions on the right.

{% preview source=true %}

{% feature media-position="start" %}
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

---

pipeline
## How it works

- **Parse**

  Markdoc turns your Markdown into an AST.

- **Transform**

  Rune schemas reinterpret the AST nodes based on context.

- **Render**

  The identity transform adds BEM classes and structural elements. Your theme takes it from there.
{% /feature %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `align` | `string` | `center` | Horizontal alignment of headline + body text: `left`, `center`, `right` |

## Section header

Feature supports an optional eyebrow, headline, and blurb above the section above feature items. Place a short paragraph or heading before the main content to use them. See [Page sections](/extend/rune-authoring/page-sections) for the full syntax.

### Layout attributes

The body splits on `---` into **media → content** zones (media-first in source). `media-position` controls visual placement independently of source order. In beside layouts (`start`/`end`), the definitions stack vertically inside the content column; in `top`/`bottom`, they tile as a grid.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `media-position` | `string` | `bottom` | Where the media sits: `top`, `bottom` (the default — media beneath the text), `start` (left), `end` (right) |
| `media-ratio` | `string` | — | Media's share of the row when beside content (`start`/`end`): `1/3`, `2/5`, `1/2`, `3/5`, `2/3` |
| `valign` | `string` | — | Cross-axis alignment when media is beside content: `top`, `center`, `bottom`, `stretch` |
| `collapse` | `string` | — | Breakpoint at which beside layouts collapse to a stack: `sm`, `md`, `lg`, `never` |

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
