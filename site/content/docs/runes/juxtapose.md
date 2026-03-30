---
title: Juxtapose
description: Interactive side-by-side comparison with slider, toggle, fade, and auto modes
---

# Juxtapose

Interactive content comparison. A `---` separator splits content into two panels. Four interaction modes let readers compare content with a draggable slider, A/B toggle, crossfade, or scroll-triggered animation. Use the `labels` attribute to add overlay labels to each panel.

## Basic usage

Content before `---` becomes the first panel, content after becomes the second. The default `slider` variant adds a draggable divider between the two panels.

{% preview source=true %}

{% juxtapose %}

![Oak tree summer](https://assets.refrakt.md/oak-tree-summer.png)

---

![Oak tree winter](https://assets.refrakt.md/oak-tree-winter.png)

{% /juxtapose %}

{% /preview %}

## With sandbox

Panels are not restricted to images. Put two sandboxes with light and dark modes to showcase a component design

{% preview source=true %}

{% juxtapose %}

{% sandbox src="profile-card" framework="tailwind" tint-mode="light" %}{% /sandbox %}

---

{% sandbox src="profile-card" framework="tailwind" tint-mode="dark" %}{% /sandbox %}

{% /juxtapose %}

{% /preview %}

## Toggle variant

Use `variant="toggle"` for a button-based A/B switch between panels. Labels appear on the toggle buttons rather than overlaid on the content.

{% preview source=true %}

{% juxtapose variant="toggle" labels="Summer, Winter" %}

![Oak tree summer](https://assets.refrakt.md/oak-tree-summer.png)

---

![Oak tree winter](https://assets.refrakt.md/oak-tree-winter.png)

{% /juxtapose %}

{% /preview %}

## Fade variant

Use `variant="fade"` for a crossfade transition between panels. The `duration` attribute controls animation speed in milliseconds.

{% preview source=true %}

{% juxtapose variant="fade" labels="Summer, Winter" duration=800 %}

![Oak tree summer](https://assets.refrakt.md/oak-tree-summer.png)

---

![Oak tree winter](https://assets.refrakt.md/oak-tree-winter.png)

{% /juxtapose %}

{% /preview %}

## Auto variant

Use `variant="auto"` for scroll-triggered animation that automatically moves the slider position as the reader scrolls past.

{% preview source=true %}

{% juxtapose variant="auto" labels="Summer, Winter" duration=2000 %}

![Oak tree summer](https://assets.refrakt.md/oak-tree-summer.png)

---

![Oak tree winter](https://assets.refrakt.md/oak-tree-winter.png)

{% /juxtapose %}

{% /preview %}

## Horizontal orientation

Use `orientation="horizontal"` to stack panels vertically with a horizontal divider. The default is `vertical` (side-by-side with a vertical divider).

{% preview source=true %}

{% juxtapose orientation="horizontal" labels="Summer, Winter" %}

![Oak tree summer](https://assets.refrakt.md/oak-tree-summer.png)

---

![Oak tree winter](https://assets.refrakt.md/oak-tree-winter.png)

{% /juxtapose %}

{% /preview %}

## Markdown reinterpretation

| Markdown | Interpretation |
|----------|----------------|
| `---` | Panel separator |
| Content between separators | Panel body |

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `string` | `slider` | Interaction mode: `slider`, `toggle`, `fade`, or `auto` |
| `orientation` | `string` | `vertical` | Divider axis for slider/auto variants: `horizontal` or `vertical` |
| `position` | `number` | `50` | Initial slider position as a percentage (0-100) |
| `duration` | `number` | `1000` | Animation duration in milliseconds (fade/auto variants) |
| `labels` | `string` | - | Comma-separated labels for the two panels. Displayed as overlays (or on toggle buttons for the toggle variant) |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | - | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | - | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | - | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | - | Named background preset from theme configuration |
