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

## Overlay

Add a colour overlay on top of the background to improve text readability.

```markdoc
{% hero %}
{% bg src="/images/photo.jpg" overlay="dark" %}
# Readable heading
The dark overlay ensures text remains legible over the image.
{% /hero %}
```

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
| `overlay` | `string` | `none` | Overlay effect: `none`, `dark`, `light` |
| `blur` | `string` | `none` | Blur strength: `none`, `sm`, `md`, or `lg` |
| `position` | `string` | `center` | CSS background-position value (e.g., `top`, `bottom left`) |
| `fit` | `string` | `cover` | Image fit mode: `cover` or `contain` |
| `opacity` | `string` | `1` | Background opacity (e.g., `0.5`) |
| `fixed` | `boolean` | `false` | Fixed/parallax background effect |
