---
title: Faction
description: Organizations and groups with ranks, holdings, and alignment
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Faction

Organizations, guilds, orders, and groups for worldbuilding. Headings within the rune become named sections for ranks, holdings, goals, and more.

## Basic usage

Describe a faction with sections that break down its structure.

{% preview source=true %}

{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" layout="split" %}
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
