---
title: Milestones
description: Release targets and their progress.
---

# Milestones

## Active
Milestones currently being worked.

{% collection type="milestone" filter="status:active" sort="-name" layout="grid" %}
{% partial file="milestone-card.md" variables={item: $item} /%}
{% /collection %}

---

## Planning
Milestones being scoped — work not yet started.

{% collection type="milestone" filter="status:planning" sort="-name" layout="grid" %}
{% partial file="milestone-card.md" variables={item: $item} /%}
{% /collection %}

---

## Complete
Shipped milestones.

{% collection type="milestone" filter="status:complete" sort="-name" layout="grid" %}
{% partial file="milestone-card.md" variables={item: $item} /%}
{% /collection %}
