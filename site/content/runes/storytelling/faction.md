---
title: Faction
description: Organizations and groups with ranks, holdings, and alignment
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:faction"} /%}

Organizations, guilds, orders, and groups for worldbuilding. For a single person, use [character](/runes/storytelling/character); for a place, [realm](/runes/storytelling/realm).

## Basic usage

Describe a faction with sections that break down its structure.

{% preview source=true %}

	{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" media-position="start" %}
	![Knights of the Silver Order in formation](https://assets.refrakt.md/faction-the-silver-order.png)

	Knights sworn to hold the Eastern March for three centuries.

	## Ranks

	- Initiate
	- Knight
	- Commander
	- Grand Master

	## Holdings

	Their fortress overlooks Thornwall from the northern cliffs.
	{% /faction %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| An image before everything else | The scene illustration ([Place the scene](#place-the-scene)) |
| Paragraphs before the first heading | The description |
| A heading | A named section; the content up to the next heading of that level is its body |

## Classify a faction

`type`, `alignment` and `size` are free text shown in the faction's header: a thieves' guild might be `type="thieves guild" alignment="chaotic" size="medium"`, a royal court `type="kingdom" alignment="lawful" size="massive"`.

## Place the scene

A faction's `scene` field (the image at the top of each section) is the media zone; `media-position` controls where it sits relative to the content. Beside layouts (`start`/`end`) collapse to a stack at narrow widths.

`media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:faction"} /%}
