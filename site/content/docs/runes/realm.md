---
title: Realm
description: Location profiles for worldbuilding with geography and notable features
---

# Realm

Location and place profiles for worldbuilding. Headings within the rune become named sections, and the first image is extracted as a scene illustration.

## Basic usage

Describe a location with sections for geography, features, or history.

{% preview source=true %}

{% realm name="Rivendell" type="sanctuary" scale="settlement" parent="Eriador" %}
The Last Homely House East of the Sea.

## Geography

A hidden valley in the foothills of the Misty Mountains.

## Notable Features

- Hall of Fire
- Council chamber
- Extensive libraries
{% /realm %}

{% /preview %}

## Realm types

Use the `type` attribute to categorize your locations.

{% preview source=true %}

{% realm name="The Undercroft" type="dungeon" scale="complex" %}
## Overview

A sprawling network of tunnels beneath the old city, home to smugglers and worse.

## Dangers

- Flooded passages
- Collapsing ceilings
- Cave spiders
{% /realm %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Realm name (required) |
| `type` | `string` | `place` | Realm type (e.g. `city`, `dungeon`, `plane`, `sanctuary`) |
| `scale` | `string` | — | Size or scope descriptor (e.g. `settlement`, `region`, `complex`) |
| `parent` | `string` | — | Parent realm reference for hierarchical locations |
| `tags` | `string` | — | Comma-separated metadata tags |
