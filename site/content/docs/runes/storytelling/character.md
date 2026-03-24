---
title: Character
description: Rich character profiles with sections for backstory, abilities, and more
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Character

Character profiles for worldbuilding and storytelling. Headings within the rune are automatically converted into named sections, and the first image becomes the character portrait.

## Basic usage

Headings become character sections, and the first image (if any) is extracted as a portrait.

{% preview source=true %}

{% character name="Veshra" role="antagonist" status="alive" aliases="The Bone Witch" tags="magic-user" %}
## Backstory

Raised in the shadow of the Ashen Spire, Veshra discovered her gift for necromancy at a young age.

## Abilities

- Bone conjuration
- Spirit binding
- Plague whisper
{% /character %}

{% /preview %}

## Roles

The `role` attribute controls visual styling to distinguish character importance.

{% preview source=true %}

{% character name="Elena" role="protagonist" status="alive" %}
## Background

The hero of the story — a wandering scholar searching for lost texts.
{% /character %}

{% /preview %}

## Status tracking

Track whether a character is alive, dead, unknown, or missing.

{% preview source=true %}

{% character name="Lord Ashford" role="supporting" status="dead" %}
## Legacy

Once the warden of the Eastern March, Lord Ashford fell during the Siege of Thornwall.
{% /character %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Character name (required) |
| `role` | `string` | `supporting` | Character role: `protagonist`, `antagonist`, `supporting`, or `minor` |
| `status` | `string` | `alive` | Character status: `alive`, `dead`, `unknown`, or `missing` |
| `aliases` | `string` | — | Comma-separated list of aliases or nicknames |
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
