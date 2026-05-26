---
title: Bugs
description: Open and resolved bug reports, grouped by status.
---

# Bugs

## Confirmed
Reproduced bugs awaiting a fix.

{% collection type="bug" filter="status:confirmed" sort="severity" layout="grid" %}
{% partial file="bug-card.md" variables={item: $item} /%}
{% /collection %}

---

## In progress
Bugs currently being worked on.

{% collection type="bug" filter="status:in-progress" sort="severity" layout="grid" %}
{% partial file="bug-card.md" variables={item: $item} /%}
{% /collection %}

---

## Fixed
Resolved bugs.

{% collection type="bug" filter="status:fixed" sort="-modified" layout="grid" %}
{% partial file="bug-card.md" variables={item: $item} /%}
{% /collection %}
