---
title: Storyboard
description: Comic and storyboard layouts from images and captions
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Storyboard

Comic/storyboard layout. Images become panels, following paragraphs become captions.

## Basic usage

Each image starts a new panel. Text after the image becomes that panel's caption.

{% preview source=true %}

{% storyboard columns=3 %}
![Dawn](https://picsum.photos/seed/dawn/600/400)

The journey begins at first light.

![Forest](https://picsum.photos/seed/forest/600/400)

An unexpected path through the trees.

![Summit](https://picsum.photos/seed/summit/600/400)

The view from the top changes everything.
{% /storyboard %}

{% /preview %}

## Comic style

Thick borders and slightly tilted panels give a comic book feel.

{% preview source=true %}

{% storyboard columns=3 variant="comic" %}
![Hero](https://picsum.photos/seed/hero/600/400)

Our hero sets out on an adventure.

![Challenge](https://picsum.photos/seed/storm/600/400)

A storm blocks the way forward!

![Victory](https://picsum.photos/seed/sunset/600/400)

Against all odds, a new dawn rises.
{% /storyboard %}

{% /preview %}

## Polaroid style

White-framed panels with drop shadows, like pinned photos.

{% preview source=true %}

{% storyboard columns=2 variant="polaroid" %}
![Coast](https://picsum.photos/seed/coast/600/400)

Summer by the sea

![Mountains](https://picsum.photos/seed/alpine/600/400)

Autumn in the mountains

![City](https://picsum.photos/seed/city/600/400)

Winter in the city

![Garden](https://picsum.photos/seed/garden/600/400)

Spring blooms again
{% /storyboard %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | `3` | Panels per row |
| `variant` | `string` | `clean` | Visual variant: `clean`, `comic`, `polaroid` |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
