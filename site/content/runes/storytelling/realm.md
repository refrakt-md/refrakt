---
title: Realm
description: Location profiles for worldbuilding with geography and notable features
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:realm"} /%}

Location and place profiles for worldbuilding. For a person, use [character](/runes/storytelling/character); for an order, guild or other group, [faction](/runes/storytelling/faction).

## Basic usage

Describe a location with sections for geography, features, or history.

{% preview source=true %}

	{% realm name="Hollowmere" type="sanctuary" scale="settlement" media-position="start" %}
	![The terraced halls of Hollowmere above a river gorge](https://assets.refrakt.md/realm-rivendell.png)

	The last refuge of the scholars who fled the Ashen Spire.

	## Geography

	A hidden valley at the head of the Eastern March, reachable only by a single cliff road.

	## Notable Features

	- The Lantern Hall
	- A bridge of living stone
	- Libraries carved into the gorge
	{% /realm %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| An image before everything else | The scene illustration ([Place the scene](#place-the-scene)) |
| Paragraphs before the first heading | The description |
| A heading | A named section; the content up to the next heading of that level is its body |

## Nest realms

`parent` names the realm a place sits inside, so a district can belong to its city and a city to its region. `type` and `scale` are free text — `city`, `forest`, `dungeon`; `room`, `district`, `region`, `world`.

{% preview source=true %}

	{% realm name="The Undercroft" type="dungeon" scale="district" parent="Thornwall" media-position="start" %}
	![Flooded stone tunnels lit by a single lantern](https://assets.refrakt.md/realm-the-undercroft.png)

	## Overview

	A sprawling network of tunnels beneath Thornwall, home to the Whispering Hand and worse.

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
