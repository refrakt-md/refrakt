---
title: Realm
description: Location profiles for worldbuilding with geography and notable features
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:realm"} /%}

Location and place profiles for worldbuilding. Headings within the rune become named sections, and the first image is extracted as a scene illustration.

## Basic usage

Describe a location with sections for geography, features, or history.

{% preview source=true %}

	{% realm name="Rivendell" type="sanctuary" scale="settlement" parent="Eriador" media-position="start" %}
	![Rivendell](https://assets.refrakt.md/realm-rivendell.png)

	The Last Homely House East of the Sea.

	## Geography

	A hidden valley in the foothills of the Misty Mountains.

	## Notable Features

	- Hall of Fire
	- Council chamber
	- Extensive libraries
	{% /realm %}

{% /preview %}

## Realm types

Use the `type` attribute to categorize your locations.

{% preview source=true %}

	{% realm name="The Undercroft" type="dungeon" scale="complex" media-position="start" %}
	![The Undercroft](https://assets.refrakt.md/realm-the-undercroft.png)

	## Overview

	A sprawling network of tunnels beneath the old city, home to smugglers and worse.

	## Dangers

	- Flooded passages
	- Collapsing ceilings
	- Cave spiders
	{% /realm %}

{% /preview %}

## Place the scene

A realm's `scene` field (the image at the top of each section) is the media zone; `media-position` controls where it sits relative to the content. Beside layouts (`start`/`end`) collapse to a stack at narrow widths.

`media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:realm"} /%}
