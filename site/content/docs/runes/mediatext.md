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
![Mountain landscape](https://picsum.photos/seed/mountain/600/400)

The valley stretches out below, carved by millennia of glacial movement. In spring, wildflowers carpet the meadows in brilliant color, attracting hikers and photographers from around the world.

The trails here range from gentle walks suitable for families to challenging ridge climbs that reward with panoramic views.
{% /mediatext %}

{% /preview %}

## Image on the right

Flip the layout by setting `align="right"`.

{% preview source=true %}

{% mediatext align="right" ratio="1:2" %}
![Portrait](https://picsum.photos/seed/portrait/400/500)

Dr. Elena Vasquez has spent two decades studying marine ecosystems in the Pacific. Her research on coral reef resilience has informed conservation policy across twelve nations.

"The ocean doesn't care about borders," she says. "Neither should our efforts to protect it."
{% /mediatext %}

{% /preview %}

## Text wrapping

Enable `wrap` for text that flows around the image rather than staying in a strict column.

{% preview source=true %}

{% mediatext align="left" ratio="1:2" wrap=true %}
![Small illustration](https://picsum.photos/seed/sketch/300/300)

When text wrapping is enabled, the body text flows around the media element rather than sitting in a rigid side-by-side column layout. This creates a more natural, editorial feel — especially useful for smaller images or illustrations that don't need to dominate the layout.
{% /mediatext %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `align` | `string` | `left` | Image placement: `left` or `right` |
| `ratio` | `string` | `1:1` | Image-to-text width ratio: `1:2`, `1:1`, or `2:1` |
| `wrap` | `boolean` | `false` | Enable text wrapping around the image instead of side-by-side columns |
