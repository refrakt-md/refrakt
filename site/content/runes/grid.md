---
title: Grid
description: Flexible grid layout with columns, auto-fill, masonry, and responsive collapse
category: Arrangement
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:grid"} /%}

Flexible grid layout. Children separated by horizontal rules (`---`) become cells arranged in a responsive CSS grid. Supports explicit column spans, auto-fill mode, masonry, aspect ratio enforcement, and responsive collapse. For a set of images with captions and a lightbox, use [gallery](/runes/gallery).

## Basic usage

Equal columns created by separating content with horizontal rules.

{% preview source=true %}

	{% grid %}
	**Opening hours.** Daily 9:00–18:00, with late opening until 21:00 on Fridays in summer.

	---

	**Getting there.** Tram 4 to Garden Gate, or a ten-minute walk from the central station.

	---

	**Tickets.** Adults €12, under-16s free. Members skip the queue at the east entrance.
	{% /grid %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| `---` (a horizontal rule) | The boundary between two cells |
| The content between rules | One cell, kept as written: text, images, lists or other runes |

## Unequal columns

Use the `spans` attribute to control column widths. Values are space-separated span sizes.

{% preview source=true %}

	{% grid spans="2 1" %}
	**The glasshouses.** Three Victorian glasshouses hold the garden's tropical, desert and alpine collections. The palm house is the oldest, built in 1868 and restored in 2019.

	---

	**Allow an hour** for all three.
	{% /grid %}

{% /preview %}

## Gap

Control spacing between cells with the `gap` attribute.

{% preview source=true %}

	{% grid gap="tight" %}
	**Café** — east lawn

	---

	**Shop** — main gate

	---

	**Toilets** — by the palm house
	{% /grid %}

{% /preview %}

## Alignment

Vertically align cells within their row using the `valign` attribute. Useful when cells have different heights.

{% preview source=true %}

	{% grid valign="center" spans="2 1" %}
	**Guided walks.** A volunteer guide leads a one-hour walk through the seasonal highlights, starting at the main gate.

	Walks run at 11:00 and 14:00 every day except Monday, and are included in the ticket price.

	---

	**Free** — no booking needed.
	{% /grid %}

{% /preview %}

## Responsive collapse

Force the grid to collapse to a single column at a given breakpoint: `sm` (640px), `md` (768px), `lg` (1024px), or `never`.

{% preview source=true %}

	{% grid collapse="md" %}
	**Plan your visit.** Hours, tickets and accessibility information.

	---

	**What's in bloom.** Magnolias in the spring walk, and the first alpine gentians.
	{% /grid %}

{% /preview %}

## Auto mode

Responsive auto-fill layout. The grid creates as many columns as fit, each at least `min` wide. No explicit column count needed.

{% preview source=true %}

	{% grid mode="auto" min="200px" %}
	**Palm house**

	---

	**Desert house**

	---

	**Alpine house**

	---

	**Rose garden**
	{% /grid %}

{% /preview %}

## Masonry mode

Progressive enhancement for masonry-style layouts. Falls back to a standard grid in browsers that don't support CSS masonry.

{% preview source=true %}

	{% grid mode="masonry" columns=3 %}
	**Rose garden.** 400 varieties.

	---

	**Arboretum.** Oaks, limes and a 200-year-old cedar of Lebanon, planted when the garden was still a private estate. The cedar's lowest branch is propped on a timber crutch.

	---

	**Pond.** Water lilies from June.

	---

	**Herb garden.** Medicinal and kitchen herbs, labelled with their traditional uses.
	{% /grid %}

{% /preview %}

## Aspect ratio

Enforce a uniform aspect ratio on all grid cells. Content is cropped with `object-fit: cover` — ideal for image galleries.

{% preview source=true %}

	{% grid mode="auto" min="200px" aspect="1/1" %}
	![Moss-covered trunks in an old-growth forest](https://assets.refrakt.md/media-text-old-growth.jpg)

	---

	![A river winding through a green valley](https://assets.refrakt.md/media-text-valley.jpg)

	---

	![Raked gravel and stones in a zen garden](https://assets.refrakt.md/media-text-zen-garden.jpg)
	{% /grid %}

{% /preview %}

## Stack order

Control the order of cells when the grid collapses to a single column on mobile. By default cells stack in source order; `stack="reverse"` places the last cell first.

{% preview source=true %}

	{% grid spans="2 1" collapse="md" stack="reverse" %}
	**Today's events.** Guided walk at 11:00, bee-keeping talk at 15:00 in the education centre.

	---

	**Closing early** at 16:00 today for a private event.
	{% /grid %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:grid"} /%}
