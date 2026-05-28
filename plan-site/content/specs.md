---
title: Specs
description: All specifications, grouped by status.
---

# Specs

{% aggregate type="spec" value="status:accepted" group="status" %}
There are **{% $item.count %}** specs in total
---
{% badge %}{% $item.count %} {% humanize($item.key) %}{% /badge %}
---
No specs yet.
{% /aggregate %}

## Draft
Specifications still being shaped.

{% collection type="spec" filter="status:draft" sort="id" layout="grid" %}
---
{% partial file="spec-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing in draft
{% /hint %}
{% /collection %}

---

## Review
Specifications under review.

{% collection type="spec" filter="status:review" sort="id" layout="grid" %}
---
{% partial file="spec-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing in review
{% /hint %}
{% /collection %}

---

## Accepted
Accepted specifications — the source of truth for what to build.

{% collection type="spec" filter="status:accepted" sort="id" layout="grid" %}
---
{% partial file="spec-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
Nothing accepted yet
{% /hint %}
{% /collection %}

---

## Placeholder
Reserved IDs without content yet.

{% collection type="spec" filter="status:placeholder" sort="id" layout="grid" %}
---
{% partial file="spec-card.md" variables={item: $item} /%}
---
{% hint type="note" %}
No placeholders
{% /hint %}
{% /collection %}
