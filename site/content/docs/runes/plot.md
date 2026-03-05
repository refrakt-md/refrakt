---
title: Plot
description: Story arcs and quest trackers with progress markers
---

{% hint type="note" %}
This rune is part of **@refrakt-md/storytelling**. Install with `npm install @refrakt-md/storytelling` and add `"@refrakt-md/storytelling"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Plot

Story arcs, quests, and narrative structures with progress tracking. List items are parsed as beats with status markers — use checkbox syntax to track progress through a storyline.

## Basic usage

List items with checkbox markers become plot beats. Use `[x]` for complete, `[>]` for active, `[ ]` for planned, and `[-]` for abandoned.

{% preview source=true %}

{% plot title="The Quest for the Crown" type="quest" structure="linear" %}
The heroes must recover the lost crown before the solstice.

- [x] **Discovery** — Find the ancient map in the library
- [x] **Departure** — Leave the city under cover of darkness
- [>] **Trial** — Cross the Whispering Wastes
- [ ] **Confrontation** — Face the guardian of the vault
- [-] **Return** — Bring the crown back to the capital
{% /plot %}

{% /preview %}

## Plot types

Different narrative structures for various storytelling needs.

{% preview source=true %}

{% plot title="The Shadow War" type="campaign" structure="branching" %}
A long-running conflict with multiple factions vying for control.

- [x] **Opening moves** — The assassination of the ambassador
- [>] **Escalation** — Border skirmishes erupt across the north
- [ ] **Alliance** — Unite the free cities against the common threat
- [ ] **Final battle** — Storm the Dark Citadel
{% /plot %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | — | Plot title (required) |
| `type` | `string` | `arc` | Plot type: `arc`, `quest`, `subplot`, `campaign`, `episode`, `act`, or `chapter` |
| `structure` | `string` | `linear` | Narrative structure: `linear`, `parallel`, `branching`, or `web` |
| `tags` | `string` | — | Comma-separated metadata tags |

### Beat markers

| Marker | Status | Description |
|--------|--------|-------------|
| `[x]` | Complete | This beat has been resolved |
| `[>]` | Active | Currently in progress |
| `[ ]` | Planned | Not yet started |
| `[-]` | Abandoned | Dropped from the storyline |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
