---
title: Decision Log
description: Chronological view of architecture decision records
category: Plan
plugin: plan
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Decision Log

An aggregation rune that renders a chronological list of architecture decision records from the entity registry. Supports filtering by status and sorting by date or ID. The rune produces a sentinel that the pipeline resolves with real decision data.

## All decisions (newest first)

{% preview source=true %}

{% decision-log sort="date" /%}

{% /preview %}

## Accepted decisions only

{% preview source=true %}

{% decision-log filter="status:accepted" sort="date" /%}

{% /preview %}

## Sorted by ID

{% preview source=true %}

{% decision-log sort="id" /%}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:decision-log"} /%}

### Output structure

Renders as an ordered list (`ol.rf-decision-log__list`) where each entry (`li.rf-decision-log__entry`) contains:

- Date (`<time>` element)
- Status badge (color-coded via `[data-status]`)
- Decision ID
- Title
