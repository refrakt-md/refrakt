---
title: Itinerary
description: Day-by-day travel itineraries with timed stops and locations
---

{% hint type="note" %}
This rune is part of **@refrakt-md/places**. Install with `npm install @refrakt-md/places` and add `"@refrakt-md/places"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Itinerary

Day-by-day travel itineraries. H2 headings become days, and H3 headings with a "time — location" pattern are parsed into timed stops. Content below each stop becomes the stop description.

## Basic usage

Use H2 headings for days and "time — location" headings for individual stops.

{% preview source=true %}

{% itinerary style="day-by-day" %}
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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | `string` | `day-by-day` | Display style variant |
| `direction` | `string` | `vertical` | Layout direction |

### Day attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `label` | `string` | — | Day label (parsed from H2 heading) |
| `date` | `string` | — | Date information |

### Stop attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `time` | `string` | — | Time of the stop (parsed from heading text before `—`) |
| `location` | `string` | — | Location name (parsed from heading text after `—`) |
| `duration` | `string` | — | How long spent at this location |
| `activity` | `string` | — | Activity name |
| `lat` | `string` | — | Latitude coordinate |
| `lng` | `string` | — | Longitude coordinate |
