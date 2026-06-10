---
title: Surfaces
description: Style any rune's surfaces — elevation (shadow), frame (media presentation), and substrate (pattern). The content-author attributes of the surface model.
---

# Surfaces

Every block rune exposes one or two decorable **surfaces**, and a small, universal vocabulary styles them — no per-rune attributes to learn. A `card`, for example, has two: its **self** surface (the card box) and a **media** surface (its image/embed slot).

| Attribute | Surface | What it does |
|-----------|---------|--------------|
| `elevation` | self | a `box-shadow` that floats the box |
| `frame` / `frame-*` | media | present the media — aspect, crop, silhouette shadow, displacement |
| `substrate` / `substrate-*` | self (default) | a generated pattern (dots, grid, …) |
| `tint` | colour | recolour the surface (see [tint](/runes/tint)) |
| `bg` | image | an image/video layer behind content (see [bg](/runes/bg)) |

`elevation` and `frame-shadow` are the same physical property (a shadow) on two different surfaces, so they carry two names and never collide. For how a theme registers `frame` presets or changes which surface a fill targets, see the [surface model](/extend/theme-authoring/surfaces) (theme config).

## elevation — float the box

`none | sm | md | lg`, on every block rune. `elevation="none"` flattens a rune's default shadow.

{% preview source=true %}

{% card elevation="sm" %}
### `elevation="sm"`
A lightly lifted card.
{% /card %}

{% card elevation="lg" %}
### `elevation="lg"`
A more pronounced float — same shadow scale, higher z-height.
{% /card %}

{% /preview %}

## frame — present the media

`frame` decorates a rune's media surface. Apply a named preset (`frame="screenshot"`) or set facets inline (they also work with no preset):

| Facet | Values | Effect |
|-------|--------|--------|
| `frame-aspect` | e.g. `16/9`, `1/1` | aspect ratio |
| `frame-shadow` | `none\|sm\|md\|lg` | silhouette `drop-shadow` |
| `frame-displace` | `top\|bottom\|end\|bottom-end\|top-end` | move the guest toward an edge |
| `frame-offset` | `none\|sm\|md\|lg\|xl` | displacement distance (named scale) |
| `frame-oversize` | scale factor | guest exceeds its slot (clipped) |
| `frame-place` | `left top`, … | alignment within the slot |
| `frame-anchor` | `object-position` | crop focal point |

On a `figure` or `showcase` the frame lands on the rune itself; on a `card` / `bento-cell` it lands on the media zone.

{% preview source=true %}

{% figure frame-shadow="lg" frame-aspect="16/9" %}
![Framed media](https://picsum.photos/seed/framechrome/800/450)
{% /figure %}

{% /preview %}

{% preview source=true %}

{% card elevation="md" frame-aspect="16/9" frame-anchor="center" %}
![Cover](https://picsum.photos/seed/cardframe/800/450)
---
### Two surfaces
`elevation` floats the card; `frame-*` presents the image in its media zone.
{% /card %}

{% /preview %}

Whether a displaced or oversized guest spills out or is cropped into a "peek" is decided by the **host**, not the guest — see [host-owned clip](/extend/theme-authoring/surfaces#host-owned-clip).

## substrate — a generated pattern

`substrate` prints a token-generated pattern on a surface (no image asset). The vocabulary is fixed — `dots | grid | lines | cross | checker | none` — with inline facets:

| Facet | Values | Effect |
|-------|--------|--------|
| `substrate` | `dots\|grid\|lines\|cross\|checker\|none` | the pattern |
| `substrate-size` | `sm\|md\|lg` | cell size |
| `substrate-opacity` | `sm\|md\|lg` | ink strength |
| `substrate-fill` | `inherit` (default) / `inset` | sit on the surface, or the recessed inset fill |

A substrate fills the rune's **self** surface by default (a banner pattern covers the whole banner); opt into the media well with `substrate-target="media"`.

{% preview source=true %}

{% card substrate="dots" %}
### dots
A token-generated dot grid — no image asset.
{% /card %}

{% card substrate="grid" %}
### grid
Two tiled linear-gradients.
{% /card %}

{% card substrate="lines" substrate-opacity="lg" %}
### lines
Diagonal hatching at a heavier ink strength.
{% /card %}

{% /preview %}

`substrate-fill="inset"` paints the pattern over a slightly recessed fill that tracks the surface colour:

{% preview source=true %}

{% card substrate="dots" %}
### `inherit`
Dots on the card's own surface (the default).
{% /card %}

{% card substrate="dots" substrate-fill="inset" %}
### `inset`
Dots over the recessed inset fill — a touch deeper, still tint-tracking.
{% /card %}

{% /preview %}

## See also

- [Surface gallery](/runes/surface-gallery) — the whole model on one page: chrome, fills, cover layouts, and posture shown together
- [tint](/runes/tint) · [bg](/runes/bg) — the colour and image fill layers
- [Surface model](/extend/theme-authoring/surfaces) — the theme-side configuration: `frame`/`bg` preset registries, `frameTarget`/`substrateTarget` routing, the inset token, host-owned clip, and the substrate ownership split
