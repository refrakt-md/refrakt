---
title: Itinerary
description: Day-by-day travel itineraries with timed stops and locations
category: Places
plugin: places
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:itinerary"} /%}

A travel plan, day by day, with a time and a place for each stop.

## Basic usage

{% preview source=true %}

	{% itinerary variant="day-by-day" %}
	## Day 1 — Arrival

	### 9:00 AM — Narita Airport

	Clear customs and pick up your Japan Rail Pass at the JR counter.

	### 12:00 PM — Shinjuku

	Check in to the hotel and grab lunch at a nearby ramen shop.

	### 6:00 PM — Shibuya

	Explore the famous crossing and have dinner in the area.

	## Day 2 — Temples & Gardens

	### 8:00 AM — Meiji Shrine

	Start the day with a peaceful walk through the shrine grounds.

	### 11:00 AM — Harajuku

	Browse Takeshita Street and the backstreet boutiques.
	{% /itinerary %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A `##` heading | A day, labelled with the heading |
| A heading inside a day, such as `### 9:00 AM — Narita Airport` | A stop: the text before the first dash is its time, the rest its place |
| The content under a stop heading | The stop's description |
| A short paragraph, then a `#` heading and a paragraph, before the first day | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |

## Single-day itinerary

Without H2 headings, all stops are grouped into a single implicit day.

{% preview source=true %}

	{% itinerary %}
	### 10:00 AM — Museum of Modern Art

	Spend the morning exploring the permanent collection.

	### 1:00 PM — Central Park

	Picnic lunch on the Great Lawn.

	### 3:00 PM — Times Square

	Walk through the theater district.
	{% /itinerary %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:itinerary"} /%}
