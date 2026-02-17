---
title: Map
description: Interactive map visualization from Markdown lists of locations
---

# Map

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

## Route

Ordered lists with `route="true"` draw a connecting line between pins.

{% preview source=true %}

{% map route="true" style="terrain" %}
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

| Attribute | Type | Default | Description |
|---|---|---|---|
| `zoom` | number | auto | Initial zoom level (1–20) |
| `center` | string | auto | Center point — coordinates or address |
| `style` | string | `street` | Map style: `street`, `satellite`, `terrain`, `dark`, `minimal` |
| `height` | string | `medium` | Container height: `small`, `medium`, `large`, `full` |
| `provider` | string | `openstreetmap` | Tile provider: `openstreetmap`, `mapbox` |
| `interactive` | string | `true` | Enable pan/zoom interaction |
| `route` | string | `false` | Connect pins with a route line |
| `cluster` | string | `false` | Cluster nearby pins at low zoom |

## Markdown reinterpretation

| Markdown | Interpretation |
|---|---|
| Unordered list | Location pins |
| Ordered list | Route waypoints (sequential) |
| Bold text in list item | Pin name |
| Italic text in list item | Pin description (shown in popup) |
| Heading | Pin group label (toggleable layers) |
| Coordinates in text | Direct lat/lng position |
| Address text | Geocoded via Nominatim at runtime |
