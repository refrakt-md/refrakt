---
title: Backlog
description: Aggregation view of plan entities with filtering, sorting, and grouping
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Backlog

An aggregation rune that renders a live view of plan entities from the entity registry. Supports filtering by any field, sorting, and grouping. Use `show` to select entity types — work items, bugs, specs, decisions, or milestones. The rune produces a sentinel that the pipeline resolves with real entity data — no manual list maintenance required.

## Ready items sorted by priority

{% preview source=true %}

{% backlog filter="status:ready" sort="priority" /%}

{% /preview %}

## In-progress items

{% preview source=true %}

{% backlog filter="status:in-progress" sort="priority" /%}

{% /preview %}

## Grouped by status

{% preview source=true %}

{% backlog sort="priority" group="status" /%}

{% /preview %}

## Bugs only

{% preview source=true %}

{% backlog show="bug" sort="severity" /%}

{% /preview %}

## Decisions

{% preview source=true %}

{% backlog show="decision" sort="date" /%}

{% /preview %}

## Specs

{% preview source=true %}

{% backlog show="spec" /%}

{% /preview %}

## Multi-field filter

Filters combine with AND logic. Multiple values for the same field combine with OR.

{% preview source=true %}

{% backlog filter="status:ready priority:high priority:critical" sort="priority" /%}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | `string` | — | Space-separated `field:value` pairs. Same-field values are OR'd; different fields are AND'd. Fields: `status`, `priority`, `severity`, `assignee`, `milestone`, `complexity`, `tags` |
| `sort` | `string` | `priority` | Sort field: `priority`, `status`, `id`, `assignee`, `complexity`, `milestone`, `date` |
| `group` | `string` | — | Group by field: `status`, `priority`, `assignee`, `milestone`, `type`, `tags` |
| `show` | `string` | `all` | Entity types to include: `all`, `work`, `bug`, `spec`, `decision`, `milestone`. Note: `all` includes work and bug only (for backward compatibility) — other types must be requested explicitly |

### Output structure

Each entity renders as a card (`article.rf-backlog__card`) containing:

- ID badge
- Status badge (color-coded via `[data-status]`)
- Priority badge (work items only)
- Complexity badge (work items, when not "unknown")
- Severity badge (bugs only)
- Milestone badge (when assigned)
- Title

When `group` is set, cards are wrapped in groups with a heading showing the group value.
