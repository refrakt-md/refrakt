---
title: Realm
description: Location profiles for worldbuilding with geography and notable features
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Realm

Location and place profiles for worldbuilding. Headings within the rune become named sections, and the first image is extracted as a scene illustration.

## Basic usage

Describe a location with sections for geography, features, or history.

{% preview source=true %}

{% realm name="Rivendell" type="sanctuary" scale="settlement" parent="Eriador" layout="split" %}
![Rivendell](https://assets.refrakt.md/realm-rivendell.png)

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

{% realm name="The Undercroft" type="dungeon" scale="complex" layout="split" %}
![The Undercroft](https://assets.refrakt.md/realm-the-undercroft.png)

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

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
