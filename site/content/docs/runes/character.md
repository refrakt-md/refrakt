---
title: Character
description: Rich character profiles with sections for backstory, abilities, and more
---

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
