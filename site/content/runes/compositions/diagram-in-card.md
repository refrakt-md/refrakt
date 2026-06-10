---
title: Architecture card
description: A diagram in a card's media zone — a captioned diagram presented as a card.
---

# Architecture card

A `{% diagram %}` in a card's media zone is an architecture card: the rendered diagram fills the media well, a caption sits below. The diagram is static SVG, so it's a presentational guest with no interaction caveats.

{% preview source=true %}

{% card %}
{% diagram language="mermaid" %}
```mermaid
graph LR
  A[Content] --> B[Transform]
  B --> C[Render]
  C --> D[HTML]
```
{% /diagram %}

---

### Pipeline at a glance
Four stages, content to output.
{% /card %}

{% /preview %}

## How it works

The diagram renders to inline SVG, then the media-zone contract sizes it to the card's media well. No `href` caveats apply — a diagram is non-interactive, so it composes the same whether or not the card links.

## See also

- [card](/runes/card) · [diagram](/runes/diagram)
- [Composability contract](/extend/rune-authoring/composability)
