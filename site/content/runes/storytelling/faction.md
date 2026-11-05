---
title: Faction
description: Organizations and groups with ranks, holdings, and alignment
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:faction"} /%}

Organizations, guilds, orders, and groups for worldbuilding. Headings within the rune become named sections for ranks, holdings, goals, and more.

## Basic usage

Describe a faction with sections that break down its structure.

{% preview source=true %}

	{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" media-position="start" %}
	![The Silver Order](https://assets.refrakt.md/faction-the-silver-order.png)

	A prestigious order of knights sworn to protect the realm.

	## Ranks

	- Initiate
	- Knight
	- Commander
	- Grand Master

	## Holdings

	Their fortress overlooks the capital city from the northern cliffs.
	{% /faction %}

{% /preview %}

## Different faction types

Use `type` and `alignment` to classify organizations.

{% preview source=true %}

	{% faction name="The Whispering Hand" type="thieves guild" alignment="chaotic" size="medium" %}
	An underground network of spies and thieves operating across the port cities.

	## Operations

	- Smuggling
	- Information brokering
	- Blackmail
	{% /faction %}

{% /preview %}

## Place the scene

A faction's `scene` field (the image at the top of each section) is the media zone; `media-position` controls where it sits relative to the content. Beside layouts (`start`/`end`) collapse to a stack at narrow widths.

`media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:faction"} /%}
