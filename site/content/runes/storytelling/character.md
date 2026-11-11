---
title: Character
description: Rich character profiles with sections for backstory, abilities, and more
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:character"} /%}

Character profiles for worldbuilding and storytelling. For a place, use [realm](/runes/storytelling/realm); for an order, guild or other group, [faction](/runes/storytelling/faction).

## Basic usage

{% preview source=true %}

	{% character name="Veshra" role="antagonist" status="alive" aliases="The Bone Witch" tags="magic-user" %}
	## Backstory

	Raised in the shadow of the Ashen Spire, Veshra discovered her gift for necromancy at a young age.

	## Abilities

	- Bone conjuration
	- Spirit binding
	- Plague whisper
	{% /character %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| An image before everything else | The character's portrait |
| Paragraphs before the first heading | The description |
| A heading | A named section; the content up to the next heading of that level is its body |

## Role and status

`role` sets how prominent a character is in the story — `protagonist`, `antagonist`, `supporting` or `minor` — and `status` records where they stand now: `alive`, `dead`, `unknown` or `missing`. Both change the profile's styling.

{% preview source=true %}

	{% character name="Elena" role="protagonist" status="missing" %}
	## Background

	A scholar of the Ashen Spire, raised in Thornwall by its warden, Lord Ashford. Last seen taking the cliff road out of Hollowmere.
	{% /character %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:character"} /%}
