---
title: MediaText
description: Side-by-side image and text layouts with configurable ratios
---

# MediaText

Side-by-side media and text layouts. Images within the rune are extracted into a media column, and the remaining text forms the body column. Control image placement, size ratio, and text wrapping.

## Basic usage

Place an image alongside text — the image is automatically extracted and placed according to the `align` attribute.

{% preview source=true %}

{% mediatext align="left" ratio="1:1" %}
![Mountain landscape](https://assets.refrakt.md/media-text-valley.jpg)

The valley stretches out below, carved by millennia of glacial movement. In spring, wildflowers carpet the meadows in brilliant color, attracting hikers and photographers from around the world.

The trails here range from gentle walks suitable for families to challenging ridge climbs that reward with panoramic views.
{% /mediatext %}

{% /preview %}

## Image on the right

Flip the layout by setting `align="right"`.

{% preview source=true %}

{% mediatext align="right" ratio="1:2" %}
![Ancient forest](https://assets.refrakt.md/media-text-old-growth.jpg)

Old-growth forests like this one in the Pacific Northwest contain trees over 500 years old, forming dense canopies that filter sunlight into soft, dappled patterns on the forest floor. The thick understory of ferns and moss supports an ecosystem found nowhere else on earth.

Walking through these forests feels like stepping back in time. The silence is broken only by birdsong and the occasional crack of a falling branch, while the air carries the rich scent of cedar and damp earth.
{% /mediatext %}

{% /preview %}

## Text wrapping

Enable `wrap` for text that flows around the image rather than staying in a strict column.

{% preview source=true %}

{% mediatext align="left" ratio="2:1" wrap=true %}
![Japanese zen garden](https://assets.refrakt.md/media-text-zen-garden.jpg)

The Japanese zen garden, or *karesansui*, is an art form centuries in the making. Raked gravel represents flowing water, while carefully placed stones suggest mountains rising from the sea. Bonsai trees — shaped over decades of patient pruning — anchor the composition with gnarled trunks and delicate canopies that echo their full-sized counterparts in miniature.

In spring, cherry blossoms drift across the garden like pink snow, settling on the raked patterns and dissolving the boundary between the designed and the natural. The transience of the blossoms is central to the experience — a reminder that beauty is most vivid in its passing. Visitors often sit in silence on the wooden engawa, watching petals fall, letting the stillness of the garden quiet the mind.
{% /mediatext %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `align` | `string` | `left` | Image placement: `left` or `right` |
| `ratio` | `string` | `1:1` | Image-to-text width ratio: `1:2`, `1:1`, or `2:1` |
| `wrap` | `boolean` | `false` | Enable text wrapping around the image instead of side-by-side columns |

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
