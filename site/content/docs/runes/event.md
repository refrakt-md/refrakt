---
title: Event
description: Event information with date, location, and agenda
---

{% hint type="note" %}
This rune is part of **@refrakt-md/places**. Install with `npm install @refrakt-md/places` and add `"@refrakt-md/places"` to the `packages` array in your `refrakt.config.json`.
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

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | `string` | — | Event start date |
| `endDate` | `string` | — | Event end date |
| `location` | `string` | — | Venue name or "Online" |
| `url` | `string` | — | Event or registration URL |

## Section header

Event supports an optional eyebrow, headline, and blurb above the section above event details. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
