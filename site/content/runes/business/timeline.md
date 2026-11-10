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
	## 2015 - Founded

	Acme Coffee opened its first café on Main Street, Portland, roasting in the back room.

	## 2019 - Roastery

	Moved roasting to a dedicated roastery and began supplying twelve local restaurants.

	## 2024 - Subscription

	Launched a coffee subscription, now shipping fresh roasts to 10,000 homes.
	{% /timeline %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading such as `2023 - Founded` | An entry; the text before the first dash or colon is its date, the rest its label |
| The content under the heading, up to the next one | The entry's description |
| A short paragraph, then a heading one level above the entries and a paragraph, before the first entry | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |

## Explicit entries

Use `{% timeline-entry %}` tags for more control over date and label values.

{% preview source=true %}

	{% timeline %}
		{% timeline-entry date="Q1 2024" label="Subscription pilot" %}
		Two hundred regulars tried a fortnightly delivery from the Main Street café.
		{% /timeline-entry %}

		{% timeline-entry date="Q3 2024" label="Nationwide launch" %}
		The subscription opened to every US address, with roast-to-door in three days.
		{% /timeline-entry %}
	{% /timeline %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:timeline"} /%}
