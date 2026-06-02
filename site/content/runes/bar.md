---
title: Bar
description: Block-level wrapper that renders a horizontal row of content — the bar layout primitive, composable in prose
---

# Bar

A bar is a horizontal row that flags context: an identifier on the left, a status badge on the right; a date and a category; a breadcrumb and an action. The `{% bar %}` rune is the user-authoring handle for the SPEC-080 `bar` layout primitive — the same DOM and CSS as a projected metadata block rendered with `layout: 'bar'`.

A bar is position-agnostic geometry: place one in the **eyebrow** position (the slot above a title) for a kicker, or anywhere a labelled strip is wanted.

## Basic usage

Split the body on a top-level `---` to get two groups. The right group is pushed to the end of the row.

{% preview source=true %}

{% bar %}
WORK-051
---
{% badge sentiment="positive" %}done{% /badge %}
{% /bar %}

{% /preview %}

## Single group

Omit the `---` to render a single left-aligned group.

{% preview source=true %}

{% bar %}
Just one side — no right group.
{% /bar %}

{% /preview %}

## Composable inside other runes

Drop a bar inside any block rune that accepts authored content. The rune emits the same DOM regardless of where it appears, so themes that style `[data-zone-layout="bar"]` style every bar consistently.

```markdoc
{% card %}
{% bar %}
ID-123
---
{% badge sentiment="positive" %}New{% /badge %}
{% /bar %}

# Card title

Body content here.
{% /card %}
```

## Output

The identity transform emits:

```html
<div data-rune="bar"
     data-zone-layout="bar"
     class="rf-bar">
  <div>
    WORK-051
  </div>
  <div data-align="end">
    <span class="rf-badge" data-meta-sentiment="positive" data-meta-type="tag">done</span>
  </div>
</div>
```

When omitted, the right group wrapper is not emitted — the markup degrades to a single left group.

## CSS

Geometry comes from the universal `[data-zone-layout="bar"]` selector in Lumina's `dimensions/metadata.css`:

```css
[data-zone-layout="bar"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

/* the right group (and anything after it) hugs the row's end */
[data-zone-layout="bar"] [data-align="end"] {
  margin-left: auto;
}
```

## See also

- [Blocks & layout](/extend/theme-authoring/blocks-and-layout) — the spec this rune projects.
- [`{% badge %}`](/runes/badge) — the chip primitive that pairs naturally with a bar's right group.
- [`{% deflist %}`](/runes/deflist) — sibling composable rune for the `definition-list` layout primitive.
