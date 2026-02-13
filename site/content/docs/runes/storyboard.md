---
title: Storyboard
description: Comic and storyboard layouts from images and captions
---

# Storyboard

Comic/storyboard layout. Images become panels, following paragraphs become captions.

## Basic usage

Each image starts a new panel. Text after the image becomes that panel's caption.

```markdoc
{% storyboard columns=3 %}
![Panel 1](https://picsum.photos/seed/dawn/600/400)

The journey begins.

![Panel 2](https://picsum.photos/seed/forest/600/400)

An unexpected discovery.

![Panel 3](https://picsum.photos/seed/summit/600/400)

The plot thickens...
{% /storyboard %}
```

{% storyboard columns=3 %}
![Dawn](https://picsum.photos/seed/dawn/600/400)

The journey begins at first light.

![Forest](https://picsum.photos/seed/forest/600/400)

An unexpected path through the trees.

![Summit](https://picsum.photos/seed/summit/600/400)

The view from the top changes everything.
{% /storyboard %}

## Comic style

Thick borders and slightly tilted panels give a comic book feel.

```markdoc
{% storyboard columns=3 style="comic" %}
...
{% /storyboard %}
```

{% storyboard columns=3 style="comic" %}
![Hero](https://picsum.photos/seed/hero/600/400)

Our hero sets out on an adventure.

![Challenge](https://picsum.photos/seed/storm/600/400)

A storm blocks the way forward!

![Victory](https://picsum.photos/seed/sunset/600/400)

Against all odds, a new dawn rises.
{% /storyboard %}

## Polaroid style

White-framed panels with drop shadows, like pinned photos.

```markdoc
{% storyboard columns=2 style="polaroid" %}
...
{% /storyboard %}
```

{% storyboard columns=2 style="polaroid" %}
![Coast](https://picsum.photos/seed/coast/600/400)

Summer by the sea

![Mountains](https://picsum.photos/seed/alpine/600/400)

Autumn in the mountains

![City](https://picsum.photos/seed/city/600/400)

Winter in the city

![Garden](https://picsum.photos/seed/garden/600/400)

Spring blooms again
{% /storyboard %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | `3` | Panels per row |
| `style` | `string` | `clean` | Visual style: `clean`, `comic`, `polaroid` |
