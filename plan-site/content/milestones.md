---
title: Milestones
description: Release targets and their progress.
---

# Milestones

{% aggregate type="milestone" value="status:complete" group="status" %}
There are **{% $item.count %}** milestones in total
---
{% badge %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No milestones yet.
{% /aggregate %}

## Active
Milestones currently being worked.

{% collection type="milestone" filter="status:active" sort="-name" layout="grid" %}
---
{% partial file="milestone-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing active
{% /hint %}
{% /collection %}

---

## Planning
Milestones being scoped — work not yet started.

{% collection type="milestone" filter="status:planning" sort="-name" layout="grid" %}
---
{% partial file="milestone-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing in planning
{% /hint %}
{% /collection %}

---

## Complete
Shipped milestones.

{% collection type="milestone" filter="status:complete" sort="-name" layout="grid" %}
---
{% partial file="milestone-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing complete yet
{% /hint %}
{% /collection %}
