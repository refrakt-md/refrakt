---
title: Showcase
description: Present visual content with frame chrome — shadow, displacement (bleed), offset, and aspect ratio
---

# Showcase

Present visual content in a constrained viewport with optional decorative chrome. The showcase rune wraps images, videos, or embedded content — useful for screenshots, product shots, or component previews.

Showcase is the degenerate `frameTarget: "self"` case of the [surface model](/runes/surfaces): its body *is* the media, so `frame` chrome (shadow, displacement, offset, aspect) lands on the showcase itself. Its distinct value is **breakout** — spilling past a non-clipping ancestor.

{% hint type="warning" %}
SPEC-086 — showcase's old `shadow` / `bleed` / `offset` / `aspect` / `place` attributes are now **deprecated aliases** for the `frame-*` facets below. They still work (with a build warning) for one minor release, then are removed. Use the `frame-*` facets.
{% /hint %}

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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `frame-shadow` | `string` | `none` | Silhouette `drop-shadow`: `none`, `sm`, `md`, `lg` |
| `frame-displace` | `string` | — | Edge/corner to move toward: `top`, `bottom`, `end`, `bottom-end`, `top-end` |
| `frame-offset` | `string` | — | Displacement distance (named scale): `none`, `sm`, `md`, `lg`, `xl` |
| `frame-aspect` | `string` | — | Viewport aspect ratio (e.g. `16/9`, `4/3`, `1/1`) |
| `frame-place` | `string` | — | Alignment of the framed box within its slot (e.g. `left top`) |
| `frame-anchor` | `string` | — | Crop focal point when cut (`object-position`) |
| `frame-oversize` | `string` | — | Scale factor by which the guest exceeds its slot (clipped guests only) |
| `frame` | `string` | — | Named frame preset from theme/project config (facets above override it) |

**Deprecated aliases** (emit a build warning): `shadow` → `frame-shadow` (`soft`/`hard`/`elevated` → `sm`/`md`/`lg`), `bleed` → `frame-displace`, `offset` → `frame-offset` (named scale; raw lengths warn), `aspect` → `frame-aspect`, `place` → `frame-place`.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `elevation` | `string` | — | Self-surface `box-shadow`: `none`, `sm`, `md`, `lg` |
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
