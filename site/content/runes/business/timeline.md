---
title: Timeline
description: Chronological events displayed as a timeline
category: Business
plugin: business
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:timeline"} /%}

Chronological events: a company's history, a project's milestones, a roadmap. For a product's release notes, use [changelog](/runes/docs/changelog); for instructions a reader follows in order, [steps](/runes/marketing/steps); for a story's arc, [plot](/runes/storytelling/plot).

## Heading-based timeline

{% preview source=true %}

	{% timeline %}
	## 2023 - Founded

	The company was founded with a mission to simplify content authoring for developer teams.

	## 2024 - Public launch

	Released v1.0 with support for 15 semantic runes and two themes. Open-sourced the core framework.

	## 2025 - Community growth

	Reached 10,000 users and launched the plugin marketplace for custom runes.
	{% /timeline %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading such as `2023 - Founded` | An entry; the text before the first dash or colon is its date, the rest its label |
| The content under the heading, up to the next one | The entry's description |
| A short paragraph, then a heading one level above the entries and a paragraph, before the first entry | The eyebrow, headline and blurb ([Page sections](/docs/authoring/page-sections)) |

## Explicit entries

Use `{% timeline-entry %}` tags for more control over date and label values.

{% preview source=true %}

	{% timeline %}
		{% timeline-entry date="Q1 2024" label="Alpha release" %}
		Initial release to early testers.
		{% /timeline-entry %}

		{% timeline-entry date="Q3 2024" label="Beta release" %}
		Public beta with full documentation.
		{% /timeline-entry %}
	{% /timeline %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:timeline"} /%}
