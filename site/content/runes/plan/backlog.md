---
title: Backlog
description: Aggregation view of plan entities with filtering, sorting, and grouping
category: Plan
plugin: plan
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Backlog

An aggregation rune that renders a live view of plan entities from the entity registry. Supports filtering by any field, sorting, grouping, and capping. Use `show` to select entity types — work items, bugs, specs, decisions, or milestones. The rune produces a sentinel that the pipeline resolves with real entity data — no manual list maintenance required.

The examples below pass `limit=5` so they stay scannable; in real dashboards omit the attribute (or set it higher) to render the full set.

## Ready items sorted by priority

{% preview source=true %}

{% backlog filter="status:ready" sort="priority" limit=5 /%}

{% /preview %}

## In-progress items

{% preview source=true %}

{% backlog filter="status:in-progress" sort="priority" limit=5 /%}

{% /preview %}

## Grouped by status

{% preview source=true %}

{% backlog sort="priority" group="status" limit=10 /%}

{% /preview %}

## Bugs only

{% preview source=true %}

{% backlog show="bug" sort="severity" limit=5 /%}

{% /preview %}

## Decisions

{% preview source=true %}

{% backlog show="decision" sort="date" limit=5 /%}

{% /preview %}

## Specs

{% preview source=true %}

{% backlog show="spec" limit=5 /%}

{% /preview %}

## Multi-field filter

Filters combine with AND logic. Multiple values for the same field combine with OR.

{% preview source=true %}

{% backlog filter="status:ready priority:high priority:critical" sort="priority" limit=5 /%}

{% /preview %}

## Top N (limit)

`limit=N` caps the rendered set after sort and before group. Useful for "top N by priority" dashboards.

{% preview source=true %}

{% backlog filter="status:ready" sort="priority" limit=3 /%}

{% /preview %}

## Table layout

`layout="table"` renders the universal projection as columns — *Identifier · Type · Status · Title* — handy for a dense, mixed-type view:

{% preview source=true %}

{% backlog show="all" layout="table" sort="status" limit=8 /%}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | `string` | — | Space-separated `field:value` pairs. Same-field values are OR'd; different fields are AND'd. Fields: `status`, `priority`, `severity`, `assignee`, `milestone`, `complexity`, `tags` |
| `sort` | `string` | `priority` | Sort field: `priority`, `status`, `id`, `assignee`, `complexity`, `milestone`, `date` |
| `group` | `string` | — | Group by field: `status`, `priority`, `assignee`, `milestone`, `type`, `tags` |
| `show` | `string` | `all` | Entity types to include: `all`, `work`, `bug`, `spec`, `decision`, `milestone`. `all` is work + bug; other types must be requested explicitly |
| `layout` | `string` | `cards` | Item layout: `cards` (default), `list`, or `table`. Forwarded to the underlying `collection`. |
| `limit` | `number` | — | Cap the number of entities rendered. Applied after sort, before group — "top N" semantics. Unset renders the full filtered set. |

### Output structure

Backlog is thin sugar over [`collection`](/runes/collection): each entity renders through a **universal projection** that works for every plan type by construction.

- **Cards / list** (default) — each item is a [`card`](/runes/card) whose top strip is a [`bar`](/runes/bar): the **identifier** (`id`, or `name` for milestones) on the left, a sentiment-coloured **status** [`badge`](/runes/badge) on the right, the title below. When the set spans more than one type (and isn't grouped by type), a small **type chip** appears beside the identifier — omitted for a single-type backlog, so there's no noise.
- **Table** — *Identifier · Type · Status · Title* columns.

When scoped to a single type, a card also surfaces that type's key field — `work` shows **priority**, `bug` shows **severity** — since the set is homogeneous. A mixed set stays universal (no ragged per-row columns); for richer per-type detail, author your own `collection` body. When `group` is set, items are wrapped in groups headed by the group value.
