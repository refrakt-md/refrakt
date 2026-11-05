---
title: Backlog
description: Aggregation view of plan entities with filtering, sorting, and grouping
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:backlog"} /%}

An aggregation rune that renders a live view of plan entities from the entity registry. Supports filtering by any field, sorting, grouping, and capping. Use `show` to select entity types — work items, bugs, specs, decisions, or milestones. The list is built from your plan files at build time, so there is nothing to maintain by hand.

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

## Grouped by tag

`group` accepts a multi-value field. `group="tags"` gives one group per tag, and an item tagged `runes, data` appears under both. A group's size is the number of entities carrying that tag, so the sizes can add up to more than the number of items shown.

{% preview source=true %}

	{% backlog show="work" filter="status:ready" group="tags" limit=5 /%}

{% /preview %}

{% preview source=true %}

	{% backlog filter="status:ready" sort="priority" limit=3 /%}

{% /preview %}

## Table layout

`layout="table"` renders the universal projection as columns — *Identifier · Type · Status · Title* — handy for a dense, mixed-type view:

{% preview source=true %}

	{% backlog show="all" layout="table" sort="status" limit=8 /%}

{% /preview %}

### What it shows

Each entity is shown the same way, whatever its type:

- **Cards** (the default): the identifier on the left of the top line, a coloured status badge on the right, and the title below. When the backlog mixes types and isn't grouped by type, a small type label sits beside the identifier.
- **Table**: Identifier, Type, Status and Title columns.

A backlog of one type also shows that type's key field: priority for work items, severity for bugs. For anything richer, write your own [`collection`](/runes/collection) body. With `group`, items are gathered under a heading per group value.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:backlog"} /%}
