---
title: Plan Activity
description: Recent activity feed sorted by file modification time
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Plan Activity

Renders a recent activity feed showing the most recently modified plan entities. Each entry displays the modification date, entity type, ID, status, and title. Status badges are color-coded using the plan status palette.

This is a self-closing aggregation rune — it produces a sentinel that the pipeline resolves with live entity data, sorted by file modification time.

## Default (last 10 items)

{% preview source=true %}

{% plan-activity /%}

{% /preview %}

## Custom limit

Show fewer or more recent items.

{% preview source=true %}

{% plan-activity limit="5" /%}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `number` | `10` | Maximum number of recent items to show |

### Output structure

The rune resolves to an ordered list of entries, each containing:

- Modification date (`<time>` element, ISO date format)
- Entity type label (work, bug, spec, decision)
- Entity ID
- Status badge with `[data-status]` color-coding
- Entity title

Items are sorted by file modification time, most recent first. Only entities with available `mtime` data are included.
