---
title: Plot
description: Story arcs and quest trackers with progress markers
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:plot"} /%}

Story arcs, quests, and narrative structures, with progress tracked beat by beat. For real-world events in date order, use [timeline](/runes/business/timeline).

## Basic usage

{% preview source=true %}

	{% plot title="The Quest for the Crown" type="quest" structure="linear" %}
	The heroes must recover the lost crown before the solstice.

	- [x] **Discovery** — Find the ancient map in the library
	- [x] **Departure** — Leave the city under cover of darkness
	- [>] **Trial** — Cross the Whispering Wastes
	- [ ] **Confrontation** — Face the guardian of the vault
	- [-] **Return** — Bring the crown back to the capital
	{% /plot %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| Paragraphs before the list | The plot's description |
| A list item | A beat |
| `[x]`, `[>]`, `[ ]` or `[-]` at the start of an item | The beat's status: complete, active, planned or abandoned |
| Bold text in the item | The beat's label; the text after it is the beat's description |

## Plot types

Different narrative structures for various storytelling needs.

{% preview source=true %}

	{% plot title="The Shadow War" type="campaign" structure="branching" %}
	A long-running conflict with multiple factions vying for control.

	- [x] **Opening moves** — The assassination of the ambassador
	- [>] **Escalation** — Border skirmishes erupt across the north
	- [ ] **Alliance** — Unite the free cities against the common threat
	- [ ] **Final battle** — Storm the Dark Citadel
	{% /plot %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:plot"} /%}
