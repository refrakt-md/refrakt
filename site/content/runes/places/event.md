---
title: Event
description: Event information with date, location, and agenda
category: Places
plugin: places
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/places**. Install with `npm install @refrakt-md/places` and add `"@refrakt-md/places"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Event

Event information with date, location, and agenda. Lists become speaker/agenda items, links become registration URLs.

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

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:event"} /%}

## Section header

Event supports an optional eyebrow, headline, and blurb above the section above event details. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

