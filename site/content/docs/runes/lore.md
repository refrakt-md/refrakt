---
title: Lore
description: In-world knowledge entries for myths, prophecies, and historical records
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Lore

In-world knowledge entries for worldbuilding — myths, prophecies, historical records, legends, or encyclopedia articles. Content is rendered directly as the lore body, with optional spoiler protection.

## Basic usage

Wrap any in-world knowledge in a lore entry with a title and category.

{% preview source=true %}

{% lore title="The Prophecy of the Chosen One" category="prophecy" spoiler=true %}
An ancient text found in the ruins of the First Temple.

> *When darkness covers the land and the last star fades,
> one shall rise from forgotten blood to forge the world anew.*

The prophecy has been interpreted differently by various factions throughout history.
{% /lore %}

{% /preview %}

## Categories

Use the `category` attribute to classify different types of lore.

{% preview source=true %}

{% lore title="The Founding of Ironhold" category="history" %}
In the third age, a band of dwarven exiles discovered rich veins of mithril beneath the Grey Peaks. They established Ironhold, which grew into the greatest forge-city the world had ever seen.
{% /lore %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | — | Lore entry title (required) |
| `category` | `string` | — | Category or classification (e.g. `prophecy`, `history`, `legend`, `myth`) |
| `spoiler` | `boolean` | `false` | Whether this entry contains spoilers |
| `tags` | `string` | — | Comma-separated metadata tags |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
