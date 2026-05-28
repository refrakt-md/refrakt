---
title: Bugs
description: Open and resolved bug reports, grouped by status.
---

# Bugs

{% aggregate type="bug" value="status:fixed" group="status" %}
There are **{% $item.count %}** bugs in total
---
{% badge %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No bugs reported.
{% /aggregate %}

## Confirmed
Reproduced bugs awaiting a fix.

{% collection type="bug" filter="status:confirmed" sort="severity" layout="grid" %}
---
{% partial file="bug-card.md" variables={item: $item} /%}
---
{% hint type="check" %}
Nothing confirmed
{% /hint %}
{% /collection %}

---

## In progress
Bugs currently being worked on.

{% collection type="bug" filter="status:in-progress" sort="severity" layout="grid" %}
---
{% partial file="bug-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing in progress
{% /hint %}
{% /collection %}

---

## Fixed
Resolved bugs.

{% collection type="bug" filter="status:fixed" sort="-modified" layout="grid" %}
---
{% partial file="bug-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing fixed yet
{% /hint %}
{% /collection %}
