---
title: Showcase
description: Present visual content with frame chrome — shadow, displacement (bleed), offset, and aspect ratio
category: Arrangement
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:showcase"} /%}

Present visual content in a constrained viewport with optional decorative chrome. The showcase rune wraps images, videos, or embedded content — useful for screenshots, product shots, or component previews.

Showcase is the degenerate `frameTarget: "self"` case of the [surface model](/runes/surfaces): its body *is* the media, so `frame` chrome (shadow, displacement, offset, aspect) lands on the showcase itself. Its distinct value is **breakout** — spilling past a non-clipping ancestor.

## Basic usage

Wrap any visual content in a showcase to give it a framed presentation.

{% preview source=true %}

	{% showcase %}
	![Dashboard screenshot](https://picsum.photos/seed/dashboard/800/450)
	{% /showcase %}

{% /preview %}

## Shadow

Add a silhouette `drop-shadow` with `frame-shadow`. Four levels: `none`, `sm`, `md`, `lg`. (This is distinct from `elevation`, which is a `box-shadow` on a rune's *self* surface — see [surfaces](/runes/surfaces).)

{% preview source=true %}

	{% showcase frame-shadow="sm" %}
	![Interface preview](https://picsum.photos/seed/interface/800/450)
	{% /showcase %}

{% /preview %}

{% preview source=true %}

	{% showcase frame-shadow="lg" %}
	![Product shot](https://picsum.photos/seed/product/800/450)
	{% /showcase %}

{% /preview %}

## Bleed (displacement)

Let the showcase spill beyond its container — a breakout host renders `overflow: visible`. `frame-displace` picks the edge or corner the content moves toward; `frame-offset` is the distance.

{% preview source=true %}

	{% showcase frame-shadow="sm" frame-displace="bottom" frame-offset="lg" %}
	![App screenshot](https://picsum.photos/seed/appscreen/800/500)
	{% /showcase %}

{% /preview %}

Displace directions: `top`, `bottom`, `end`, `bottom-end`, `top-end` (`both` is also accepted). `frame-offset` is a **named scale** — `none`, `sm`, `md`, `lg`, `xl` (backed by the spacing tokens); a raw length warns and collapses to `none`.

Clip is **host-owned**: inside a clipping host (e.g. a bento cell) the same displaced showcase is *cropped* into a peek instead of spilling. `frame-offset` collapses on mobile regardless of host.

## Aspect ratio

Enforce a uniform aspect ratio with `frame-aspect`. Content is cropped to fit (`object-fit: cover`).

{% preview source=true %}

	{% showcase frame-aspect="16/9" frame-shadow="sm" %}
	![Landscape](https://picsum.photos/seed/landscape/800/600)
	{% /showcase %}

{% /preview %}

## Combined

Facets compose freely.

{% preview source=true %}

	{% showcase frame-shadow="lg" frame-displace="both" frame-aspect="16/9" %}
	![Hero image](https://picsum.photos/seed/heroimg/800/500)
	{% /showcase %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:showcase"} /%}
