---
title: Background
description: Add background images, video, and overlays to any section rune
category: Backgrounds & color
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:bg"} /%}

A directive rune that produces no visible output. Place `{% bg %}` as the first child of any block rune to add a background layer with images, video, overlays, blur, and positioning controls.

## Image background

Add a background image to any rune that supports backgrounds.

{% preview source=true %}

	{% hero %}
		{% bg src="https://assets.refrakt.md/media-text-valley.jpg" /%}
		# The valley trail
		Eleven miles along the river, from the trailhead to the falls.
	{% /hero %}

{% /preview %}

## Video and animated backgrounds

`video` takes the URL of a looping video and plays it, muted, behind the content: `{% bg video="/media/surf.mp4" /%}`. For a generated, animated backdrop, put a `{% sandbox %}` inside the bg instead:

{% preview source=true %}

	{% hero %}
		{% bg overlay="dark" overlay-opacity="0.4" %}
			{% sandbox src="wireframe-waves" /%}
		{% /bg %}
		# Tide tables
		High and low water for every harbour on the coast, updated daily.
	{% /hero %}

{% /preview %}

## Gradient fill

A token-driven gradient is the most common generated backdrop (heroes, CTAs). Set it inline with `gradient` (direction), `from`/`to` (and optional `via`) — **semantic token names**, resolved to `var(--rf-color-*)` so the gradient tracks the theme/`tint` — and `gradient-type` (`linear` default, `radial`, `conic`). A gradient raises the bg layer with no image needed.

{% preview source=true %}

	{% hero %}
		{% bg gradient="to-b" from="primary" to="surface" /%}
		# Spring workshop
		Two days of hands-on sessions, April 12–13, in Lisbon.
	{% /hero %}

{% /preview %}

Directions are a bounded set: `to-t`, `to-b`, `to-l`, `to-r`, `to-tr`, `to-br`, `to-bl`, `to-tl` (no raw angles — that's the escape hatch's job). These also work as host-level facets (`bg-gradient`, `bg-from`/`bg-to`/`bg-via`, `bg-gradient-type`) without a `{% bg %}` child, and a theme can register a named gradient preset (`bg="brand-fade"`).

#### Stop shapes

Each gradient stop accepts three forms:

- **Token name** — `from="primary"` emits `var(--rf-color-primary)`, theme- and tint-aware.
- **`transparent`** — the CSS keyword. `from="transparent" to="primary"` fades from clear to the theme colour without falling back to a raw-CSS preset.
- **`name/alpha`** — Tailwind-style shorthand for a token at partial opacity. `to="primary/0.5"` (decimal) or `to="primary/50"` (percent) compiles to `color-mix(in srgb, var(--rf-color-primary) 50%, transparent)`. Useful for soft washes (`from="transparent" to="primary/0.3"`) that still track the theme's primary.

## Overlay

A flat colour wash over the background, for legibility. `dark` / `light` are presets; a **token name** (e.g. `overlay="primary"`) washes with `var(--rf-color-primary)` at `overlay-opacity`.

{% preview source=true %}

	{% hero %}
		{% bg src="https://assets.refrakt.md/media-text-old-growth.jpg" overlay="dark" /%}
		# Old-growth forest walk
		A two-hour loop under trees that were standing before the town was founded.
	{% /hero %}

{% /preview %}

## Scrim

A structured legibility treatment behind overlaid text — richer than a flat overlay. `scrim` sets the heavy edge (`top`/`bottom`/`left`/`right`); `scrim-type` is `gradient` (default, a directional darken/lighten) or `frost` (a `backdrop-filter` blur + tint); `scrim-tone` (`dark`/`light`) picks whether it darkens or lightens — and **flips the overlaid content's foreground** to match, so a `dark` scrim gives you light text (and `light` gives dark text) without setting colours by hand.

The `scrim*` attributes are **universal attributes on the rune the background sits behind**, not attributes of `{% bg %}` — `bg` supplies the image, the rune carries the treatment:

{% preview source=true %}

	{% hero scrim="bottom" scrim-strength="lg" %}
		{% bg src="https://assets.refrakt.md/figure-hot-springs.jpg" /%}
		# The hot springs
		Open year-round. The upper pools close at dusk.
	{% /hero %}

{% /preview %}

`scrim-strength` (`sm`/`md`/`lg`) tunes the gradient; `scrim-blur` (`sm`/`md`/`lg`) tunes frost. In `cover` mode the same scrim targets the media well (see [card](/runes/card)).

## Blur, position and fit

Control how the image sits behind the content. This one is softened and anchored to its top edge:

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
| `opacity` | `0` to `1` | Fades the image into the background colour |
| `fixed` | `true` | Keeps the image in place while the page scrolls past, a parallax effect |

## Named presets & the escape hatch

A theme or project registers named `bg` presets (applied with `bg="name"`). A preset's gradient is **structured** and token-driven:

```jsonc
// refrakt.config.json (project) or theme config → backgrounds
"backgrounds": {
  "brand-fade": { "gradient": { "type": "linear", "direction": "to-br", "stops": ["primary", "surface"] } }
}
```

For the genuine long tail (animations, exotic effects) a preset may carry a raw-CSS **escape hatch**, `style` — a last resort that **bypasses the token system** (you own cross-theme behaviour and portability):

```jsonc
"backgrounds": {
  "aurora": { "style": { "background": "conic-gradient(/* … hand-tuned … */)" } }
}
```

Backgrounds are valid in **theme** config and **project** config (`refrakt.config.json`); project `backgrounds` merge over theme `backgrounds` by name. A build-time soft warning flags a raw gradient in `style` that the structured `gradient` field now covers.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:bg"} /%}
