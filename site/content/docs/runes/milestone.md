---
title: Milestone
description: Named release target with scope, goals, and status tracking
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Milestone

A named release target or goal. Not a sprint — no timebox, no velocity, no ceremonies. A milestone is a coherent set of capabilities that together deliver value. When all work items assigned to it are done, the milestone is complete.

## Active milestone

A milestone currently in progress with goals.

{% preview source=true %}

{% milestone name="v0.5.0" target="2026-03-29" status="active" %}
# v0.5.0 — Layout & Tint

- Complete alignment system migration
- Ship tint rune with dark mode support
- Publish layout spec as site documentation
- Resolve showcase bleed overflow bug
{% /milestone %}

{% /preview %}

## Planning milestone

A future milestone still being scoped.

{% preview source=true %}

{% milestone name="v1.0" target="2026-06-01" status="planning" %}
# v1.0 — Stable Release

- Stabilise all public APIs
- Complete documentation for all runes
- Launch theme marketplace
- Publish migration guide from v0.x
{% /milestone %}

{% /preview %}

## Completed milestone

A milestone with all goals achieved.

{% preview source=true %}

{% milestone name="v0.4.0" status="complete" %}
# v0.4.0 — Foundation

- Core rune system operational
- Identity transform engine complete
- Lumina theme baseline shipped
{% /milestone %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | — | Milestone name, e.g. `v0.5.0` (required) |
| `target` | `string` | — | Target date (aspirational, not a commitment) |
| `status` | `string` | `planning` | Current status: `planning`, `active`, `complete` |

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
