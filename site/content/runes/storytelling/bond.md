---
title: Bond
description: Relationship connections between characters or entities
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Bond

Relationships and connections between characters or entities. Content within the rune describes the nature and history of the relationship.

## Basic usage

Define a relationship between two entities with a type and status.

{% preview source=true %}

{% bond from="Aragorn" to="Legolas" type="fellowship" status="active" %}
Forged during the Council of Elrond, their bond was tested through the War of the Ring. Despite their different backgrounds, they developed a deep mutual respect.
{% /bond %}

{% /preview %}

## One-directional bonds

Set `bidirectional` to `false` for one-way relationships like mentorship or unrequited feelings.

{% preview source=true %}

{% bond from="Gandalf" to="Frodo" type="mentorship" status="active" bidirectional=false %}
Gandalf chose Frodo as the ring-bearer, guiding him with wisdom and trust throughout the quest.
{% /bond %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:bond"} /%}

