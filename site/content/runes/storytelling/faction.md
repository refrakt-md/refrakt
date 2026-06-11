---
title: Faction
description: Organizations and groups with ranks, holdings, and alignment
category: Storytelling
plugin: storytelling
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Faction

Organizations, guilds, orders, and groups for worldbuilding. Headings within the rune become named sections for ranks, holdings, goals, and more.

## Basic usage

Describe a faction with sections that break down its structure.

{% preview source=true %}

{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" media-position="start" %}
![The Silver Order](https://assets.refrakt.md/faction-the-silver-order.png)

A prestigious order of knights sworn to protect the realm.

## Ranks

- Initiate
- Knight
- Commander
- Grand Master

## Holdings

Their fortress overlooks the capital city from the northern cliffs.
{% /faction %}

{% /preview %}

## Different faction types

Use `type` and `alignment` to classify organizations.

{% preview source=true %}

{% faction name="The Whispering Hand" type="thieves guild" alignment="chaotic" size="medium" %}
An underground network of spies and thieves operating across the port cities.

## Operations

- Smuggling
- Information brokering
- Blackmail
{% /faction %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Faction name (required) |
| `type` | `string` | — | Faction type (e.g. `guild`, `cult`, `government`, `knightly order`) |
| `alignment` | `string` | — | Alignment descriptor (e.g. `lawful`, `chaotic`, `neutral`) |
| `size` | `string` | — | Size or scope descriptor (e.g. `small`, `medium`, `large`) |
| `tags` | `string` | — | Comma-separated metadata tags |

### Layout attributes

A faction's `scene` field (the image at the top of each section) is the media zone; `media-position` controls where it sits relative to the content. Beside layouts (`start`/`end`) collapse to a stack at narrow widths.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `media-position` | `string` | `top` | Where the scene sits: `top`, `bottom`, `start` (left), `end` (right) |
| `media-ratio` | `string` | — | Scene's share of the row when beside content (`start`/`end`): `1/3`, `2/5`, `1/2`, `3/5`, `2/3` |
| `valign` | `string` | — | Cross-axis alignment when scene is beside content: `top`, `center`, `bottom`, `stretch` |
| `collapse` | `string` | — | Breakpoint at which beside layouts collapse to a stack: `sm`, `md`, `lg`, `never` |

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
