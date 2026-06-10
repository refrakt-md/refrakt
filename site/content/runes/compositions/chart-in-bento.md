---
title: Dashboard grid
description: A chart in each bento cell — a grid of metric tiles.
---

# Dashboard grid

Drop a `{% chart %}` into each `{% bento-cell %}`'s media zone and the grid becomes a dashboard: every tile is a chart with a title and note, aligned on uniform row tracks.

{% preview source=true %}

{% bento columns=6 %}

{% bento-cell %}
{% chart type="bar" %}
| Month | Revenue |
|-------|---------|
| Jan | 4200 |
| Feb | 5100 |
| Mar | 4800 |
| Apr | 6200 |
{% /chart %}

---

### Revenue
Up 14% on the quarter.
{% /bento-cell %}

{% bento-cell %}
{% chart type="line" %}
| Week | Signups |
|------|---------|
| W1 | 120 |
| W2 | 180 |
| W3 | 240 |
| W4 | 360 |
{% /chart %}

---

### Signups
Trending up week over week.
{% /bento-cell %}

{% /bento %}

{% /preview %}

## How it works

A bento cell adopts `card`'s zone contract — content splits on `---` into media / body / footer — so a `chart` in the leading zone is a media guest, sized and clipped exactly as in a [metric card](/runes/compositions/chart-in-card). The difference is only the container: the cell sits in a grid track, and uniform row tracks keep the tiles aligned. Same guest, different host.

## See also

- [bento](/runes/marketing/bento) · [chart](/runes/chart)
- [Composability contract](/extend/rune-authoring/composability)
