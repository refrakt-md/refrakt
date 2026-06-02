---
title: Deflist
description: Block-level definition list — stacked dt/dd pairs that flow into multiple columns on wider screens
---

# Deflist

A definition list rendered via the SPEC-079 `definition-list` layout primitive. Each list item starting with `**Term:**` becomes a `<dt>` / `<dd>` pair; the layout stacks dt above dd by default and flows into multiple columns at wider widths via `grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr))`.

Use it for option references, glossaries, attribute tables, recipe details, character stats — any term/description pair set. Composable inside any container rune, identical DOM to a projected metadata zone using the same layout primitive.

## Basic usage

A markdown list where each item starts with bold-text-plus-colon.

{% preview source=true %}

{% deflist %}
- **Priority:** {% badge sentiment="caution" %}high{% /badge %}
- **Complexity:** moderate
- **Assignee:** @alice
- **Milestone:** v0.18
{% /deflist %}

{% /preview %}

## Inline composition

Inline runes inside the value (after `**Term:**`) compose naturally. Use `{% badge %}` for sentiment-coloured chips, `{% ref %}` for entity links, inline code for identifiers.

{% preview source=true %}

{% deflist %}
- **Status:** {% badge sentiment="positive" %}accepted{% /badge %}
- **Version:** `v0.16.2`
- **Released:** 2026-01-15
{% /deflist %}

{% /preview %}

## Fallback for items without a bold prefix

If a list item doesn't start with `**Term:**`, the rune emits an empty `<dt>` plus the full content in `<dd>` and prints a build-time warning naming the line. Prefix every item with bold-term-colon to label it properly.

{% preview source=true %}

{% deflist %}
- **Term:** With prefix renders as dt + dd.
- This item lacks a prefix — empty dt, full content as dd.
{% /deflist %}

{% /preview %}

## Aliases

The rune is also registered as `definitions` and `terms` for authoring preference. All three names produce identical DOM.

```markdoc
{% definitions %}
- **Foo:** bar
{% /definitions %}

{% terms %}
- **Foo:** bar
{% /terms %}
```

## Output

The identity transform emits a `<dl>` with one `<div data-name="row">` per item containing a `<dt>` / `<dd>` pair:

```html
<dl data-rune="deflist"
    data-zone-layout="definition-list"
    class="rf-deflist">
  <div data-name="row">
    <dt data-meta-label>Priority</dt>
    <dd><span class="rf-badge" data-meta-sentiment="caution">high</span></dd>
  </div>
  <div data-name="row">
    <dt data-meta-label>Complexity</dt>
    <dd>moderate</dd>
  </div>
</dl>
```

The row wrappers carry no semantic role on their own — they exist so the dt/dd pair can be styled as a unit (the stacked layout uses `display: flex; flex-direction: column` on each row).

## Responsive layout

The Lumina default is stacked-then-multi-column:

```css
[data-zone-layout="definition-list"] {
  display: grid;
  grid-template-columns: 1fr;       /* stacked: 1 column, dt above dd per row */
  gap: 0.75rem 1.5rem;
}

[data-zone-layout="definition-list"] > [data-name="row"] {
  display: flex;
  flex-direction: column;            /* dt stacks above dd */
  gap: 0.125rem;
}

@media (min-width: 48rem) {
  [data-zone-layout="definition-list"] {
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }
}
```

The behaviour follows container width, not authoring choice — the same `{% deflist %}` reads stacked on narrow screens and multi-column on wider ones. If you need explicit "force stacked" or "force grid" control, a sibling `definition-grid` primitive is the right place to add it (not yet implemented).

## See also

- [Header zones + layout primitives](/extend/theme-authoring/header-zones) — the spec this rune projects.
- [`{% bar %}`](/runes/bar) — sibling composable rune for the `bar` layout primitive.
- [`{% badge %}`](/runes/badge) — the chip primitive used inside sentiment-mapped `<dd>` cells.
