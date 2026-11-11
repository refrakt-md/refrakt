---
title: Backlog
description: Aggregation view of plan entities with filtering, sorting, and grouping
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:backlog"} /%}

A list of plan entities: work items, bugs, specs, decisions or milestones, filtered, sorted and grouped. It is built from your plan files at build time, so there is nothing to keep up to date by hand. The examples below pass `limit=5` to stay short; a real dashboard usually leaves it out.

## Basic usage

{% preview source=true %}

	{% backlog filter="status:ready" sort="priority" limit=5 /%}

{% /preview %}

## Filter, sort and pick types

`filter` takes space-separated `field:value` pairs. Different fields combine with AND; several values for the same field combine with OR. This shows ready items that are high *or* critical priority:

{% preview source=true %}

	{% backlog filter="status:ready priority:high priority:critical" sort="priority" limit=5 /%}

{% /preview %}

The other views are the same rune with different values:

| To show | Write |
|---------|-------|
| Work in progress | `filter="status:in-progress"` |
| Bugs, by severity | `show="bug" sort="severity"` |
| Decision records, by date | `show="decision" sort="date"` |
| Specs | `show="spec"` |
| Milestones | `show="milestone"` |
| Newest first | a `-` before the sort field, e.g. `sort="-date"` |
| The top N | `limit=N` — applied after sorting and before grouping |

`show` defaults to `all`, which means work items and bugs together.

## Group items

`group` gathers items under a heading per value of a field: `status` (the default), `priority`, `assignee`, `milestone`, `type` or `tags`. `group-display="accordion"` collapses each group instead.

A multi-value field such as `tags` gives one group per tag, and an item tagged `runes, data` appears under both. A group's size is the number of entities carrying that tag, so the sizes can add up to more than the number of items shown.

{% preview source=true %}

	{% backlog show="work" filter="status:ready" group="tags" limit=5 /%}

{% /preview %}

## Show a table

Items show as cards by default: the identifier and a status badge on the top line, the title below, and a type label when the backlog mixes types. A backlog of one type adds that type's key field: priority for work items, severity for bugs. `layout="table"` shows Identifier, Type, Status and Title columns instead, for a dense view:

{% preview source=true %}

	{% backlog show="all" layout="table" sort="status" limit=8 /%}

{% /preview %}

For anything richer, write your own [`collection`](/runes/collection) body.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:backlog"} /%}
