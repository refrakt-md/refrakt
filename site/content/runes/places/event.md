---
title: Event
description: Event information with date, location, and agenda
category: Places
plugin: places
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:event"} /%}

A single event, such as a conference, meetup or workshop, with its dates, place and registration link, published as structured data.

## Basic usage

An event with date, location, agenda, and a registration link.

{% preview source=true %}

	{% event date="2025-06-15" endDate="2025-06-17" location="San Francisco, CA" url="https://example.com/register" %}
	# Tech Conference 2025

	Join us for three days of talks, workshops, and networking with the web development community.

	- Keynote: The Future of Web Development
	- Workshop: Building with Semantic Content
	- Panel: Open Source Sustainability
	- Networking Dinner
	{% /event %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | The event's name |
| The paragraph after it | Its description |
| A list or blockquote | The event's details, such as the agenda or the speakers |

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:event"} /%}
