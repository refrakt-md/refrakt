---
title: Background
description: Add background images, video, and overlays to any section rune
category: Backgrounds & color
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:bg"} /%}

Put an image, a video, a gradient or an animation behind a hero, a section or any other block rune. `{% bg %}` shows nothing itself: place it first inside the rune whose background it sets.

## Basic usage

{% preview source=true %}

	{% hero %}
		{% bg src="https://assets.refrakt.md/media-text-valley.jpg" /%}
		# The valley trail
		Eleven miles along the river, from the trailhead to the falls.
	{% /hero %}

{% /preview %}

## Play a video or animation

`video` takes the URL of a looping video and plays it, muted, behind the content: `{% bg video="/media/surf.mp4" /%}`. For a generated, animated backdrop, put a `{% sandbox %}` inside the bg instead:

{% preview source=true %}

	{% hero %}
		{% bg overlay="dark" overlay-opacity="0.4" %}
			{% sandbox src="wireframe-waves" /%}
		{% /bg %}
		# Tide tables
		High and low water for every harbor on the coast, updated daily.
	{% /hero %}

{% /preview %}

## Fill with a gradient

`gradient` sets the direction, and `from` and `to` (with an optional `via`) the colors. The colors are theme color names such as `primary` and `surface`, so the gradient follows the theme and any tint.

{% preview source=true %}

	{% hero %}
		{% bg gradient="to-b" from="primary" to="surface" /%}
		# Spring workshop
		Two days of hands-on sessions, April 12–13, in Lisbon.
	{% /hero %}

{% /preview %}

A color can also be `transparent`, or a theme color at partial opacity: `to="primary/0.3"` or `to="primary/30"`. `gradient-type` switches to a `radial` or `conic` gradient. The same settings work on the rune itself, without a `{% bg %}`, as `bg-gradient`, `bg-from`, `bg-to`, `bg-via` and `bg-gradient-type`.

## Darken or lighten the image

`overlay` lays a flat wash over the background so the text stays readable: `dark`, `light`, or a theme color name such as `primary`. `overlay-opacity` sets its strength.

{% preview source=true %}

	{% hero %}
		{% bg src="https://assets.refrakt.md/media-text-old-growth.jpg" overlay="dark" /%}
		# Old-growth forest walk
		A two-hour loop under trees that were standing before the town was founded.
	{% /hero %}

{% /preview %}

## Scrim

A scrim shades the background only where the text sits, and switches the text to light or dark to match. It is set on the rune in front of the background, not on `{% bg %}`:

{% preview source=true %}

	{% hero scrim="bottom" scrim-strength="lg" %}
		{% bg src="https://assets.refrakt.md/figure-hot-springs.jpg" /%}
		# The hot springs
		Open year-round. The upper pools close at dusk.
	{% /hero %}

{% /preview %}

`scrim` names the edge it is heaviest at (`top`, `bottom`, `left`, `right`) and `scrim-strength` how heavy it is. `scrim-tone="light"` lightens instead of darkening. `scrim-type="frost"` blurs and tints the background behind the text instead, with `scrim-blur` setting the amount. On a [card](/runes/card) with a cover image, the scrim shades the image.

## Position and soften the image

This image is softened and anchored to its top edge:

{% preview source=true %}

	{% hero %}
		{% bg src="https://assets.refrakt.md/figure-coral-reef.jpg" blur="sm" position="top" /%}
		# Reef survey 2026
		Forty volunteers, twelve dive sites, one count of every coral colony.
	{% /hero %}

{% /preview %}

| Set | To | Effect |
|-----|----|--------|
| `blur` | `sm`, `md`, `lg` | Softens the image behind the text |
| `position` | A CSS background position, such as `top` or `bottom left` | Which part of the image stays in view |
| `fit` | `cover` (default) or `contain` | Crop the image to fill, or show all of it |
| `opacity` | `0` to `1` | Fades the image into the background color |
| `fixed` | `true` | Keeps the image in place while the page scrolls past, a parallax effect |

## Reuse a background by name

A background used in many places can be named once in `backgrounds` in `refrakt.config.json`, then applied with `bg="name"` on the rune or `preset` on `{% bg %}`. A theme can ship named backgrounds too; the project's win when the names match.

```jsonc
"backgrounds": {
  "brand-fade": { "gradient": { "type": "linear", "direction": "to-br", "stops": ["primary", "surface"] } }
}
```

For an effect the gradient fields can't express, a named background can carry raw CSS in `style` instead, such as `{ "style": { "background": "conic-gradient(…)" } }`. Raw CSS ignores the theme's colors, so it won't follow a theme change or a tint.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:bg"} /%}
