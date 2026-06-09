---
title: Background
description: Add background images, video, and overlays to any section rune
---

# Background

A directive rune that produces no visible output. Place `{% bg %}` as the first child of any block rune to add a background layer with images, video, overlays, blur, and positioning controls.

## Image background

Add a background image to any rune that supports backgrounds.

```markdoc
{% hint type="note" %}
{% bg src="/images/texture.jpg" %}
Content with a background image.
{% /hint %}
```

## Video background

Use a looping video as the background.

```markdoc
{% hero %}
{% bg video="/videos/loop.mp4" %}
# Welcome
{% /hero %}
```

## Gradient fill

A token-driven gradient is the most common generated backdrop (heroes, CTAs). Set it inline with `gradient` (direction), `from`/`to` (and optional `via`) — **semantic token names**, resolved to `var(--rf-color-*)` so the gradient tracks the theme/`tint` — and `gradient-type` (`linear` default, `radial`, `conic`). A gradient raises the bg layer with no image needed.

```markdoc
{% hero %}
{% bg gradient="to-b" from="primary" to="surface" %}
# Gradient hero
A two-stop linear gradient, top to bottom, from token colours.
{% /hero %}
```

Directions are a bounded set: `to-t`, `to-b`, `to-l`, `to-r`, `to-tr`, `to-br`, `to-bl`, `to-tl` (no raw angles — that's the escape hatch's job). These also work as host-level facets (`bg-gradient`, `bg-from`/`bg-to`/`bg-via`, `bg-gradient-type`) without a `{% bg %}` child, and a theme can register a named gradient preset (`bg="brand-fade"`).

## Overlay

A flat colour wash over the background, for legibility. `dark` / `light` are presets; a **token name** (e.g. `overlay="primary"`) washes with `var(--rf-color-primary)` at `overlay-opacity`.

```markdoc
{% hero %}
{% bg src="/images/photo.jpg" overlay="dark" %}
# Readable heading
The dark overlay ensures text remains legible over the image.
{% /hero %}
```

{% hint type="warning" %}
A **raw-CSS** `overlay` (e.g. `overlay="linear-gradient(…)"`) is deprecated — it emits a build warning and will be removed. Use `scrim` for a legibility gradient, or `overlay="dark|light|<token>"` for a flat wash.
{% /hint %}

## Scrim

A structured legibility treatment behind overlaid text — richer than a flat overlay. `scrim` sets the heavy edge (`top`/`bottom`/`left`/`right`); `scrim-type` is `gradient` (default, a directional darken/lighten) or `frost` (a `backdrop-filter` blur + tint); `scrim-tone` (`dark`/`light`) picks whether it darkens or lightens — and **flips the overlaid content's foreground** to match, so a `dark` scrim gives you light text (and `light` gives dark text) without setting colours by hand.

```markdoc
{% hero %}
{% bg src="/images/photo.jpg" scrim="bottom" scrim-strength="lg" %}
# Legible over the photo
A bottom-weighted gradient scrim keeps the heading readable.
{% /hero %}
```

`scrim-strength` (`sm`/`md`/`lg`) tunes the gradient; `scrim-blur` (`sm`/`md`/`lg`) tunes frost. In `cover` mode the same scrim targets the media well (see [card](/runes/card)).

## Blur

Apply a blur effect to the background image.

```markdoc
{% hint type="note" %}
{% bg src="/images/bg.jpg" blur="sm" %}
Subtle blur softens the background.
{% /hint %}
```

## Position and fit

Control how the background image is positioned and scaled within its container.

```markdoc
{% hint type="note" %}
{% bg src="/images/portrait.jpg" position="top" fit="contain" %}
The image is anchored to the top and scaled to fit without cropping.
{% /hint %}
```

## Fixed background

Create a parallax-style effect where the background stays fixed during scroll.

```markdoc
{% hero %}
{% bg src="/images/landscape.jpg" fixed=true %}
# Parallax Hero
The background stays in place as you scroll.
{% /hero %}
```

## Combined attributes

All attributes can be used together for full control.

```markdoc
{% hero %}
{% bg src="/images/scene.jpg" overlay="dark" blur="lg" position="top" opacity="0.8" %}
# Full Control
Dark overlay, heavy blur, top-aligned, and slightly transparent.
{% /hero %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | — | URL of the background image |
| `video` | `string` | — | URL of the background video |
| `gradient` | `string` | — | Gradient direction (bounded set: `to-t`…`to-tl`) |
| `from` / `to` / `via` | `string` | — | Gradient stops — **semantic token names** (→ `var(--rf-color-*)`) |
| `gradient-type` | `string` | `linear` | `linear`, `radial`, or `conic` |
| `overlay` | `string` | `none` | Flat wash: `none`, `dark`, `light`, or a token name (raw CSS deprecated) |
| `overlay-opacity` | `string` | — | Opacity of a token-coloured overlay wash |
| `scrim` | `string` | — | Legibility scrim heavy edge: `top`, `bottom`, `left`, `right` |
| `scrim-type` | `string` | `gradient` | `gradient` or `frost` (backdrop blur) |
| `scrim-strength` / `scrim-blur` | `string` | `md` | Gradient strength / frost blur: `sm`, `md`, `lg` |
| `scrim-tone` | `string` | `dark` | `dark` (darken for light text) or `light` |
| `blur` | `string` | `none` | Blur strength: `none`, `sm`, `md`, or `lg` |
| `position` | `string` | `center` | CSS background-position value (e.g., `top`, `bottom left`) |
| `fit` | `string` | `cover` | Image fit mode: `cover` or `contain` |
| `opacity` | `string` | `1` | Background opacity (e.g., `0.5`) |
| `fixed` | `boolean` | `false` | Fixed/parallax background effect |

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
