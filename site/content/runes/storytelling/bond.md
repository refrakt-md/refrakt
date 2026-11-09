---
title: Bond
description: Relationship connections between characters or entities
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:bond"} /%}

Content within the rune describes the nature and history of the relationship.

## Basic usage

Define a relationship between two entities with a type and status.

{% preview source=true %}

	{% bond from="Elena" to="Veshra" type="rival" status="strained" %}
	They studied side by side at the Ashen Spire until Veshra turned to necromancy. Elena still keeps the letters they wrote each other, and still hopes to bring her back.
	{% /bond %}

{% /preview %}

## One-directional bonds

Set `bidirectional` to `false` for one-way relationships like mentorship or unrequited feelings.

{% preview source=true %}

	{% bond from="Veshra" to="Elena" type="obsession" status="active" bidirectional=false %}
	Veshra has followed Elena's every move since the Spire fell, through informants in the Whispering Hand. Elena has no idea.
	{% /bond %}

{% /preview %}

## In the relationship graph

Every bond is also an edge in the site's relationship graph, with its `type` as the edge kind (`bond` when it has none). [`relationships`](/runes/relationships) lists it on both characters' pages, or only on the `from` side when `bidirectional` is `false`. `from` and `to` may name a character by any of its `aliases`. A bond whose `from` or `to` names no character, realm, faction, lore or plot is reported as a build warning and left out of the graph.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:bond"} /%}
