---
title: Storyboard
description: Comic and storyboard layouts from images and captions
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:storyboard"} /%}

A comic or storyboard layout: a grid of panels, each an image with a caption.

## Basic usage

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

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| An image | Starts a new panel |
| A paragraph after it | The panel's caption |

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

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:storyboard"} /%}
