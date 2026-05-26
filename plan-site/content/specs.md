---
title: Specs
description: All specifications, grouped by status.
---

# Specs

## Draft
Specifications still being shaped.

{% collection type="spec" filter="status:draft" sort="id" layout="grid" %}
{% partial file="spec-card.md" variables={item: $item} /%}
{% /collection %}

---

## Review
Specifications under review.

{% collection type="spec" filter="status:review" sort="id" layout="grid" %}
{% partial file="spec-card.md" variables={item: $item} /%}
{% /collection %}

---

## Accepted
Accepted specifications — the source of truth for what to build.

{% collection type="spec" filter="status:accepted" sort="id" layout="grid" %}
{% partial file="spec-card.md" variables={item: $item} /%}
{% /collection %}

---

## Placeholder
Reserved IDs without content yet.

{% collection type="spec" filter="status:placeholder" sort="id" layout="grid" %}
{% partial file="spec-card.md" variables={item: $item} /%}
{% /collection %}
