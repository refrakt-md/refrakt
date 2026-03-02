---
title: Faction
description: Organizations and groups with ranks, holdings, and alignment
---

# Faction

Organizations, guilds, orders, and groups for worldbuilding. Headings within the rune become named sections for ranks, holdings, goals, and more.

## Basic usage

Describe a faction with sections that break down its structure.

{% preview source=true %}

{% faction name="The Silver Order" type="knightly order" alignment="lawful" size="large" %}
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
