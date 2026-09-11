---
title: Figure
description: Enhanced images with captions, sizing, and alignment
category: Content
plugin: core
status: stable
type: rune
---

# Figure

Enhanced image display with caption, sizing, and alignment controls.

## With caption attribute

Set the caption directly on the rune.

{% preview source=true %}
{% figure caption="A coral reef teeming with life beneath turquoise waters" size="large" align="center" %}
![Coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
{% /figure %}
{% /preview %}

## With paragraph caption

If no `caption` attribute is provided, the first paragraph inside the rune is used as the caption.

{% preview source=true %}
{% figure size="medium" %}
![Hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)

Steam rising from volcanic hot springs in the Icelandic highlands.
{% /figure %}
{% /preview %}

## Elevation & frame

A figure *is* a frame around its image, so it sets `frameTarget: "self"` ([surface model](/runes/surfaces)): `frame` chrome lands on the figure itself. `elevation` floats the figure as a box (`box-shadow`); `frame-shadow` is the image's silhouette `drop-shadow`; `frame-aspect` crops it to a ratio.

{% preview source=true %}
{% figure elevation="floating" frame-aspect="4/3" caption="Framed at 4/3 with a lifted figure" %}
![Coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
{% /figure %}
{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:figure"} /%}

