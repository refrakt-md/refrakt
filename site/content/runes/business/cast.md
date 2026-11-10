---
title: Cast / Team
description: People directory for team pages and speaker lineups
category: Business
plugin: business
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:cast"} /%}

A people directory for team pages, speaker lineups and contributor lists. To describe the organization itself, with its name, logo and contact details, use [organization](/runes/business/organization).

## Basic usage

{% preview source=true %}

	{% cast layout="grid" %}
	- Alice Johnson - CEO
	  ![Alice Johnson](https://assets.refrakt.md/team-alice-johnson.png)
	- Bob Smith - CTO
	  ![Bob Smith](https://assets.refrakt.md/team-bob-smith.png)
	- Carol Williams - Head of Design
	- David Chen - Lead Engineer
	{% /cast %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph, before the list | The eyebrow, headline and blurb ([Page sections](/docs/authoring/page-sections)) |
| A list item `Name - Role` | A member; the text after the dash is their role |
| An image in a list item | That member's portrait |

## List layout

Use `layout="list"` for a denser, single-column directory.

{% preview source=true %}

	{% cast layout="list" %}
	- Alice Johnson - CEO
	  ![Alice Johnson](https://assets.refrakt.md/team-alice-johnson.png)
	- Bob Smith - CTO
	  ![Bob Smith](https://assets.refrakt.md/team-bob-smith.png)
	- Carol Williams - Head of Design
	- David Chen - Lead Engineer
	{% /cast %}

{% /preview %}

## Explicit members

Use `{% cast-member %}` tags for more control, including bios.

{% preview source=true %}

	{% cast %}
		{% cast-member name="Alice Johnson" role="CEO" %}
		Alice opened the first Acme café in 2015 and still cups every new roast.
		{% /cast-member %}

		{% cast-member name="Bob Smith" role="CTO" %}
		Bob built the ordering app and runs the team behind the coffee subscription.
		{% /cast-member %}
	{% /cast %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:cast"} /%}
