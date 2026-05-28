---
title: Work
description: Every work item, grouped by status — actionable first, done last.
---

# Work

{% aggregate type="work" value="status:done" group="status" %}
There are **{% $item.count %}** work items in total
---
{% badge %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No work items yet.
{% /aggregate %}

## Blocked
Work items that can't progress until something else moves.

{% collection type="work" filter="status:blocked" sort="priority" layout="grid" %}
---
{% partial file="work-card.md" variables={item: $item} /%}
---
{% hint type="check" %}
Nothing is blocked
{% /hint %}
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
---
{% partial file="work-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing is in review
{% /hint %}
{% /collection %}

---

## Ready
Work items shaped and ready to be picked up.

{% collection type="work" filter="status:ready" sort="priority" layout="grid" %}
---
{% partial file="work-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing is ready
{% /hint %}
{% /collection %}

---

## Pending
Work items captured but not yet triaged.

{% collection type="work" filter="status:pending" sort="priority" layout="grid" %}
---
{% partial file="work-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing is pending
{% /hint %}
{% /collection %}

---

## Draft
Work items still being shaped.

{% collection type="work" filter="status:draft" sort="priority" layout="grid" %}
---
{% partial file="work-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing in draft
{% /hint %}
{% /collection %}

---

## Done
Completed work.

{% collection type="work" filter="status:done" sort="-modified" layout="grid" %}
---
{% partial file="work-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing is done
{% /hint %}
{% /collection %}
