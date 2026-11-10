---
title: Lore
description: In-world knowledge entries for myths, prophecies, and historical records
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:lore"} /%}

Content is rendered directly as the lore body, with optional spoiler protection.

## Basic usage

Wrap any in-world knowledge in a lore entry with a title and a `category` — `history`, `magic`, `culture`, or whatever grouping your world needs.

{% preview source=true %}

	{% lore title="The Founding of Thornwall" category="history" %}
	Three centuries ago, river traders raised a wall of thorn and stone where the river bends beneath the northern cliffs. The city that grew behind it still bears the name, and the first warden's seal still opens its gates.
	{% /lore %}

{% /preview %}

## Hide spoilers

`spoiler=true` hides the entry until the reader chooses to reveal it.

{% preview source=true %}

	{% lore title="The Bone Witch's Oath" category="prophecy" spoiler=true %}
	A verse scratched into the last standing wall of the Ashen Spire.

	> *When the warden falls and the lanterns fade,
	> the one who was cast out shall return to claim the March.*

	The Silver Order reads it as a warning. Veshra reads it as a promise.
	{% /lore %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:lore"} /%}
