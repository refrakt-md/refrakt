---
title: Metric card
description: A chart in a card's media zone — a single titled metric presented as a card.
---

# Metric card

A `{% chart %}` in a card's media zone is a metric card: the chart fills the media well, a title and note sit below. The same plain `card` — only the guest changed.

{% preview source=true %}

{% card %}
{% chart type="bar" %}
| Quarter | Revenue |
|---------|---------|
| Q1 | 4200 |
| Q2 | 5100 |
| Q3 | 4800 |
| Q4 | 6200 |
{% /chart %}

---

### Quarterly revenue
Up 14% on the year.
{% /card %}

{% /preview %}

## How it works

The zone before the `---` is the card's **media zone**; the media-zone contract sizes and clips its guest name-agnostically, so a `chart` presents exactly like an image would. Drop the same chart into a `bento` cell instead and you get a [dashboard grid](/runes/compositions/chart-in-bento) — same guest, different container.

## See also

- [card](/runes/card) · [chart](/runes/chart)
- [Composability contract](/extend/rune-authoring/composability)
