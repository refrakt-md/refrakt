---
title: Work
description: Every work item, grouped by status — actionable first, done last.
---

# Work

## Blocked
Work items that can't progress until something else moves.

{% collection type="work" filter="status:blocked" sort="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

---

## In progress
Work items currently being implemented.

{% collection type="work" filter="status:in-progress" sort="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

---

## Review
Work items waiting on review.

{% collection type="work" filter="status:review" sort="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

---

## Ready
Work items shaped and ready to be picked up.

{% collection type="work" filter="status:ready" sort="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

---

## Pending
Work items captured but not yet triaged.

{% collection type="work" filter="status:pending" sort="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

---

## Draft
Work items still being shaped.

{% collection type="work" filter="status:draft" sort="priority" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}

---

## Done
Completed work.

{% collection type="work" filter="status:done" sort="-modified" layout="grid" %}
{% partial file="work-card.md" variables={item: $item} /%}
{% /collection %}
