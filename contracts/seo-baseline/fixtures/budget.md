---
rune: budget
title: Trip budget
role: canonical
notes: >
  Group A, resolved — no longer emits ItemList. The categories and line
  items carry real data, but `itemListElement` needs them typed, and a
  cost breakdown is not a ranked list to begin with (WORK-567).
---
{% budget currency="JPY" duration="5 days" %}
# Tokyo Trip

A week in Japan — temples, food, and a night in a ryokan.

## Accommodation

- Hotel in Shinjuku: ¥15000
- Ryokan in Hakone: ¥25000

## Transportation

- Japan Rail Pass (7-day): ¥29650
{% /budget %}
