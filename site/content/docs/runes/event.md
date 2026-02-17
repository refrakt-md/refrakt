---
title: Event
description: Event information with date, location, and agenda
---

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

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | `string` | — | Event start date |
| `endDate` | `string` | — | Event end date |
| `location` | `string` | — | Venue name or "Online" |
| `url` | `string` | — | Event or registration URL |
