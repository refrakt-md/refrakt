---
title: Bond
description: Relationship connections between characters or entities
---

{% hint type="note" %}
This rune is part of **@refrakt/storytelling**. Install with `npm install @refrakt/storytelling` and add `"@refrakt/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Bond

Relationships and connections between characters or entities. Content within the rune describes the nature and history of the relationship.

## Basic usage

Define a relationship between two entities with a type and status.

{% preview source=true %}

{% bond from="Aragorn" to="Legolas" type="fellowship" status="active" %}
Forged during the Council of Elrond, their bond was tested through the War of the Ring. Despite their different backgrounds, they developed a deep mutual respect.
{% /bond %}

{% /preview %}

## One-directional bonds

Set `bidirectional` to `false` for one-way relationships like mentorship or unrequited feelings.

{% preview source=true %}

{% bond from="Gandalf" to="Frodo" type="mentorship" status="active" bidirectional=false %}
Gandalf chose Frodo as the ring-bearer, guiding him with wisdom and trust throughout the quest.
{% /bond %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | `string` | — | Origin entity name (required) |
| `to` | `string` | — | Target entity name (required) |
| `type` | `string` | — | Relationship type (e.g. `fellowship`, `romantic`, `antagonistic`, `familial`, `mentorship`) |
| `status` | `string` | `active` | Relationship status (e.g. `active`, `broken`, `dormant`) |
| `bidirectional` | `boolean` | `true` | Whether the bond is mutual |
