---
rune: itinerary
title: Day-by-day itinerary
role: canonical
notes: >
  Group A, resolved — no longer emits ItemList. The two days of structured
  stops reach a list only once each day is a ListItem and each stop something
  like a TouristAttraction: per-child typing, not a flat mapping (WORK-567).
  Generating this fixture also prints a pre-existing engine
  diagnostic, "`itinerary-stop` requires parent `itinerary` — found nested
  directly in `itinerary-day`". That is the rune's own structure tripping a
  parent check, not a defect in this fixture: the unabridged doc example at
  site/content/runes/places/itinerary.md prints it too. Out of scope here —
  noted so it is not mistaken for fixture breakage later.
---
{% itinerary variant="day-by-day" %}
## Day 1 — Arrival

### 9:00 AM — Narita Airport

Clear customs and pick up your Japan Rail Pass at the JR counter.

### 12:00 PM — Shinjuku

Check in to the hotel and grab lunch at a nearby ramen shop.

## Day 2 — Temples & Gardens

### 8:00 AM — Meiji Shrine

Start the day with a peaceful walk through the shrine grounds.
{% /itinerary %}
