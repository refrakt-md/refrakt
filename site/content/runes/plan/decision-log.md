---
title: Decision Log
description: Chronological view of architecture decision records
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:decision-log"} /%}

An aggregation rune that renders a chronological list of architecture decision records from the entity registry. Supports filtering by status and sorting by date or ID.

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

### What it shows

An ordered list, newest first, where each entry shows the decision's date, a status badge, its ID and its title.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:decision-log"} /%}
