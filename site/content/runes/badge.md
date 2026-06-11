---
title: Badge
description: Inline pill that flags a piece of content — status, category, recency, tag
category: Content
plugin: core
status: stable
type: rune
---

# Badge

Inline pill for flagging a piece of content. Useful for status indicators ("New", "Beta", "Deprecated"), commerce markers ("Popular", "Sale"), content categorisation ("Featured", "Sponsored"), identity ("Verified", "Staff"), recency ("Updated"), and arbitrary tagging ("Frontend", "Tutorial").

The label is **children content** — free-form text, naturally localised, no hard-coded English. Visual variant comes from two orthogonal dimensions inherited from the universal metadata system: **sentiment** (positive / negative / caution / neutral) and **type** (status / category / quantity / temporal / tag / id). Themes that ship metadata-system CSS style every combination automatically.

## Basic usage

{% preview source=true %}

This page is {% badge sentiment="caution" %}Beta{% /badge %} and may change.

{% /preview %}

The simplest form — a neutral pill with a label:

{% preview source=true %}

Tagged as {% badge %}Frontend{% /badge %} and {% badge %}Tutorial{% /badge %}.

{% /preview %}

## Sentiment

The `sentiment` attribute controls the badge's tonal colour, drawn from the theme's success / danger / warning / muted palettes.

{% preview source=true %}

{% badge sentiment="positive" %}New{% /badge %}
{% badge sentiment="caution" %}Beta{% /badge %}
{% badge sentiment="negative" %}Deprecated{% /badge %}
{% badge sentiment="neutral" %}Soon{% /badge %}

{% /preview %}

## Type

The `type` attribute picks the badge's structural treatment from the metadata-system dimensions. Most badges are tags (the default); use `status` for state indicators, `temporal` for time-sensitive markers, `id` for identifier pills.

{% preview source=true %}

{% badge type="status" sentiment="positive" %}Active{% /badge %}
{% badge type="temporal" %}Updated today{% /badge %}
{% badge type="id" %}v0.14.2{% /badge %}

{% /preview %}

## Recipes

Common usage patterns. Authors pick the sentiment that matches intent — the label text is up to them.

| Use case            | Pattern                                                                  |
|---------------------|--------------------------------------------------------------------------|
| New feature         | `{% badge sentiment="positive" %}New{% /badge %}`                        |
| Pre-release         | `{% badge sentiment="caution" %}Beta{% /badge %}`                        |
| Coming soon         | `{% badge sentiment="neutral" %}Soon{% /badge %}`                        |
| Deprecated API      | `{% badge sentiment="negative" %}Deprecated{% /badge %}`                 |
| Sponsored content   | `{% badge sentiment="neutral" %}Sponsored{% /badge %}`                   |
| Featured            | `{% badge sentiment="positive" %}Featured{% /badge %}`                   |
| Verified identity   | `{% badge sentiment="positive" %}Verified{% /badge %}`                   |
| Active status       | `{% badge type="status" sentiment="positive" %}Active{% /badge %}`       |
| Archived status     | `{% badge type="status" sentiment="neutral" %}Archived{% /badge %}`      |
| Category tag        | `{% badge %}Frontend{% /badge %}`                                        |

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `sentiment` | `positive` \| `negative` \| `caution` \| `neutral` | `neutral` | Tonal colour |
| `type` | `status` \| `category` \| `quantity` \| `temporal` \| `tag` \| `id` | `tag` | Structural treatment |

Both attribute value sets match the universal metadata-system dimensions exactly — no new enums are introduced.

## Output

The identity transform emits a single `<span>` with the resolved data attributes:

```html
<span class="rf-badge"
      data-rune="badge"
      data-meta-sentiment="positive"
      data-meta-type="tag">Popular</span>
```

All colour / weight / emphasis comes from the universal metadata CSS rules — no per-variant BEM modifiers (`.rf-badge--positive` etc.) are emitted. Themes can target `.rf-badge` directly for badge-specific overrides, or compose with `[data-meta-*]` attribute selectors for variant-aware tweaks.

## Accessibility

The badge label is a real text node — accessible to screen readers and copy-paste. Do not put visual-only labels in CSS `::before` content; the universal metadata rules use `::before` for the sentiment colour dot (decorative, with no text content) and rely on the children text for meaning.

For status badges that convey important state (e.g. "Deprecated", "Beta"), prefer placing the badge **inside** the content it qualifies — adjacent to a heading, link text, or list item — so screen readers announce the badge as part of the same context.

## Composition

Badge composes with any layout that lets you place inline content. Inside nav items, the engine recognises the badge and attaches it as a `badge` property on the item, rendered adjacent to the title:

```markdoc
{% nav layout="columns" %}
- [Security](/security) {% badge sentiment="positive" %}New{% /badge %}
- [Integrations](/integrations) {% badge sentiment="caution" %}Beta{% /badge %}
{% /nav %}
```

In tables, badges work as cell content for status columns. In headings, they flag a section's state. In prose, they flag a single sentence.
