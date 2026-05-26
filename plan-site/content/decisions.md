---
title: Decisions
description: Architecture decision records, grouped by status.
---

# Decisions

## Proposed
Open proposals awaiting acceptance.

{% collection type="decision" filter="status:proposed" sort="id" layout="grid" %}
{% partial file="decision-card.md" variables={item: $item} /%}
{% /collection %}

---

## Accepted
Accepted records — the canonical reasoning behind current architecture.

{% collection type="decision" filter="status:accepted" sort="id" layout="grid" %}
{% partial file="decision-card.md" variables={item: $item} /%}
{% /collection %}

---

## Recent activity

{% collection type="decision" sort="-date" layout="table" fields="status,date" /%}
