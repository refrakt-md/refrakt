---
title: Map
description: Interactive map visualization from Markdown lists of locations
category: Places
plugin: places
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:map"} /%}

Transform lists of locations into interactive maps. Supports named pins with coordinates or addresses, route lines, and grouped layers.

## Simple pins

List items with coordinates become map pins. Bold text sets the pin name, italic text adds a description.

{% preview source=true %}

	{% map zoom="13" center="48.8566, 2.3522" %}
	- **Louvre Museum** - *World's largest art museum* - 48.8606, 2.3376
	- **Eiffel Tower** - *Iconic iron lattice tower* - 48.8584, 2.2945
	- **Notre-Dame** - *Medieval Catholic cathedral* - 48.8530, 2.3499
	{% /map %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list item | A pin |
| Bold text in the item | The pin's name |
| Italic text in the item | The pin's description, shown in its popup |
| Coordinates such as `48.8606, 2.3376` | The pin's position |
| An address instead of coordinates | A pin placed by looking the address up |
| A heading | A group of pins, shown as a layer the reader can toggle |

## Route

Ordered lists with `route=true` draw a connecting line between pins.

{% preview source=true %}

	{% map route=true variant="terrain" %}
	- **Portland** - 45.5152, -122.6784
	- **Crater Lake** - 42.8684, -122.1685
	- **Redwood National Park** - 41.2132, -124.0046
	- **San Francisco** - 37.7749, -122.4194
	{% /map %}

{% /preview %}

## Grouped layers

Headings create pin groups that can be toggled as map layers.

{% preview source=true %}

	{% map zoom="12" center="51.5074, -0.1278" %}
	## Restaurants
	- **Dishoom** - 51.5114, -0.1263
	- **Bao** - 51.5133, -0.1375

	## Museums
	- **Tate Modern** - 51.5076, -0.0994
	- **V&A** - 51.4966, -0.1722
	{% /map %}

{% /preview %}

## Height variants

Control the map height with the `height` attribute.

```markdoc
{% map height="small" %}
- **London** - 51.5074, -0.1278
{% /map %}

{% map height="large" %}
- **Tokyo** - 35.6762, 139.6503
{% /map %}
```

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:map"} /%}
