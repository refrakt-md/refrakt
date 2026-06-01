---
title: Eyebrow
description: Block-level wrapper that renders a contextual strip above the title — split layout primitive, composable in prose
---

# Eyebrow

The eyebrow is the strip above the title that flags context: an identifier on the left, a status badge on the right; a date and a category; a breadcrumb and an action. The `{% eyebrow %}` rune is the user-authoring handle for the SPEC-079 `split` layout primitive — same DOM, same CSS, same chip primitive as a projected `zones.eyebrow = { left, right }` declaration on a rune config.

Use it inside any container rune (card, drawer, recipe, hero) to add an eyebrow row above the title, or standalone in prose when you want a divider-style label / action pair.

## Basic usage

Split the body on a top-level `---` to get a two-slot row. Left side renders in primary color (matches the projected-eyebrow look for identifier-style content); right side renders as inline content or a chip.

{% preview source=true %}

{% eyebrow %}
WORK-051
---
{% badge sentiment="positive" %}done{% /badge %}
{% /eyebrow %}

{% /preview %}

## Single slot

Omit the `---` to render only the left slot.

{% preview source=true %}

{% eyebrow %}
Just one side — no right slot.
{% /eyebrow %}

{% /preview %}

## With a title heading on the left

When the left slot contains a heading (`h1`–`h6`), the heading keeps its own typography — no primary-color override. Useful for card-style compositions with an icon-plus-title flanked by a badge.

{% preview source=true %}

{% eyebrow %}
## My Card Title
---
{% badge sentiment="caution" %}Beta{% /badge %}
{% /eyebrow %}

{% /preview %}

## Composable inside other runes

Drop an eyebrow inside any block rune that accepts authored content. The rune emits the same DOM regardless of where it appears, so themes that style `[data-zone-layout="split"]` style every eyebrow consistently.

```markdoc
{% card %}
{% eyebrow %}
ID-123
---
{% badge sentiment="positive" %}New{% /badge %}
{% /eyebrow %}

# Card title

Body content here.
{% /card %}
```

## Linked eyebrow

When the left slot contains an `<a>`, the link picks up the primary-color underline treatment (matches today's hero behaviour).

{% preview source=true %}

{% eyebrow %}
[All posts](/blog)
---
{% badge %}Engineering{% /badge %}
{% /eyebrow %}

{% /preview %}

## Output

The identity transform emits:

```html
<div data-rune="eyebrow"
     data-zone="eyebrow"
     data-zone-layout="split"
     class="rf-eyebrow">
  <div data-eyebrow-slot="left">
    WORK-051
  </div>
  <div data-eyebrow-slot="right">
    <span class="rf-badge" data-meta-sentiment="positive" data-meta-type="tag">done</span>
  </div>
</div>
```

When omitted, the right slot wrapper is not emitted — the markup degrades to a single left slot.

## CSS

Geometry comes from the universal `[data-zone-layout="split"]` selector in Lumina's `dimensions/metadata.css`:

```css
[data-zone-layout="split"] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

[data-zone-layout="split"] [data-eyebrow-slot="left"]:not(:has(:is(h1, h2, h3, h4, h5, h6))) {
  color: var(--rf-color-primary);
  font-weight: 500;
}
```

The `:not(:has(...))` scoping lets headings in the left slot keep their natural typography while plain text gets the primary-color identifier look.

## See also

- [Header zones + layout primitives](/extend/theme-authoring/header-zones) — the spec this rune projects.
- [`{% badge %}`](/runes/badge) — the chip primitive that pairs naturally with the eyebrow's right slot.
- [`{% deflist %}`](/runes/deflist) — sibling composable rune for the `definition-list` layout primitive.
