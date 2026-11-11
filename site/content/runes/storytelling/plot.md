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

	{% plot title="The Warden's Seal" type="quest" structure="linear" %}
	Elena must recover Lord Ashford's seal before Veshra uses it to open the gates of Thornwall.

	- [x] **Discovery** — Find Ashford's last letter in the libraries of Hollowmere
	- [x] **Departure** — Leave the valley by the cliff road at night
	- [>] **Descent** — Bargain with the Whispering Hand for passage through the Undercroft
	- [ ] **Confrontation** — Face Veshra beneath the city walls
	- [-] **Alliance** — Win the Silver Order's support (refused by the Grand Master)
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

`type` sets the plot's narrative scope — `arc`, `quest`, `subplot`, `campaign`, `episode`, `act` or `chapter` — and `structure` says how its beats connect: `linear`, `parallel`, `branching` or `web`. Both are shown in the plot's header, so a long-running `campaign` with `branching` beats reads differently from a single `linear` `quest`.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:plot"} /%}
