---
title: Gallery
description: Multi-image container with grid, carousel, or masonry layout
category: Arrangement
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:gallery"} /%}

A run of images laid out as a grid, a carousel or a masonry wall, each with a caption from its alt text and a click-to-enlarge lightbox. To arrange mixed content (text, cards, any block) in columns, use [grid](/runes/grid).

## Basic grid gallery

Images are displayed in a responsive grid by default.

{% preview source=true %}

	{% gallery %}
	![Moss-covered trunks in an old-growth forest](https://assets.refrakt.md/media-text-old-growth.jpg)
	![A river winding through a green valley](https://assets.refrakt.md/media-text-valley.jpg)
	![Raked gravel and stones in a zen garden](https://assets.refrakt.md/media-text-zen-garden.jpg)
	![Steam rising from terraced hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)
	{% /gallery %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| An image (or a video) | One tile of the gallery |
| The image's alt text | The tile's caption, shown below it |
| Anything else (a paragraph, a heading) | Nothing: the gallery shows only its images |

## Carousel layout

Horizontal scrolling with snap points and prev/next navigation.

{% preview source=true %}

	{% gallery layout="carousel" %}
	![Fish over a shallow coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
	![Steam rising from terraced hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)
	![A river winding through a green valley](https://assets.refrakt.md/media-text-valley.jpg)
	![Moss-covered trunks in an old-growth forest](https://assets.refrakt.md/media-text-old-growth.jpg)
	{% /gallery %}

{% /preview %}

## Masonry layout

Variable-height items arranged in CSS multi-column flow — each image keeps its natural aspect ratio and stacks down its column.

{% preview source=true %}

	{% gallery layout="masonry" columns=2 %}
	![The oak in full summer leaf](https://assets.refrakt.md/oak-tree-summer.png)
	![Fish over a shallow coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
	![Raked gravel and stones in a zen garden](https://assets.refrakt.md/media-text-zen-garden.jpg)
	![The same oak, bare under snow](https://assets.refrakt.md/oak-tree-winter.png)
	{% /gallery %}

{% /preview %}

## Custom columns

Choose how many columns the grid uses — that's the one knob authors control for layout density. Spacing between items is theme-locked to keep the tile mosaic consistent across galleries; override `--rf-gallery-gap` (or `--rf-gallery-edge` for the outer frame) at the theme level if you need to retune.

{% preview source=true %}

	{% gallery columns=2 caption="One oak, two seasons" %}
	![The oak in full summer leaf](https://assets.refrakt.md/oak-tree-summer.png)
	![The same oak, bare under snow](https://assets.refrakt.md/oak-tree-winter.png)
	{% /gallery %}

{% /preview %}

## Without lightbox

Each image opens in a click-to-enlarge lightbox. `lightbox=false` turns it off — for a gallery whose images are already shown at full size, or that sits inside a link.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:gallery"} /%}
