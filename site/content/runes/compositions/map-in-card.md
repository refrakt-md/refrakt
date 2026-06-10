---
title: Location card
description: A map in a card's media zone — a pinned place presented as a card.
---

# Location card

A `{% map %}` in a card's media zone is a location card: the map fills the media well with its pins, a title and note sit below.

{% preview source=true %}

{% card frame-aspect="3/2" %}
{% map zoom="13" center="48.8566, 2.3522" %}
- **Louvre Museum** - *World's largest art museum* - 48.8606, 2.3376
- **Notre-Dame** - *Medieval cathedral* - 48.8530, 2.3499
{% /map %}

---

### Île de la Cité
Two landmarks on the Seine.
{% /card %}

{% /preview %}

## How it works

The map is a media guest, sized and clipped by the media-zone contract. Because this card has no `href`, the map stays **interactive** — pan and zoom work. Add a whole-card link and the map demotes to a static backdrop so the tile clicks through cleanly (the [interaction-posture contract](/extend/rune-authoring/composability#media-guest-interaction-posture)).

## See also

- [card](/runes/card) · [map](/runes/places/map)
- [Composability contract](/extend/rune-authoring/composability)
