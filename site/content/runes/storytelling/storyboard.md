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
	![Knights of the Silver Order in formation](https://assets.refrakt.md/faction-the-silver-order.png)

	The Silver Order rides out of Thornwall at first light.

	![Terraced halls above a river gorge](https://assets.refrakt.md/realm-rivendell.png)

	In Hollowmere, Elena finds Lord Ashford's last letter.

	![Flooded tunnels lit by a single lantern](https://assets.refrakt.md/realm-the-undercroft.png)

	Beneath the city, the Undercroft is already waiting.
	{% /storyboard %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| An image | Starts a new panel |
| A paragraph after it | The panel's caption |

## Panel styles

`variant` changes how the panels are framed; `columns` sets how many sit in a row.

| `variant` | Panels look like |
|-----------|------------------|
| `clean` | Minimal frames (the default) |
| `comic` | Thick borders and slightly tilted panels, like a comic book |
| `polaroid` | White-framed photos with drop shadows, as if pinned to a board |

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:storyboard"} /%}
