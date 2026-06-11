---
title: Mockup as a media guest
description: A mockup with a sandbox inside any media-slot container — a single product card, or a multi-device bento grid.
---

# Mockup as a media guest

A `{% mockup %}` (with a `{% sandbox %}` inside) is a media guest like any other — drop it into a card's media zone for a product showcase, or into a bento for a multi-device gallery. The same composition adapts to its container.

## In a card — a single product tile

{% preview source=true %}

{% card %}
{% mockup device="browser" url="acme.io" %}
{% sandbox src="acme-landing" framework="tailwind" height=420 /%}
{% /mockup %}

---

### Acme landing page
The production homepage, framed in a browser chrome for the docs.
{% /card %}

{% /preview %}

## In a bento — a multi-device gallery

{% preview source=true %}

{% bento columns=6 row-height="lg" content-height="md" %}

{% bento-cell cols=4 %}
{% mockup device="browser" url="acme.io/dashboard" %}
{% sandbox src="acme-dashboard" framework="tailwind" height=460 /%}
{% /mockup %}

---

### Desktop
The full three-up metrics view, with the avatar in the top bar.
{% /bento-cell %}

{% bento-cell cols=2 %}
{% mockup device="iphone-15" %}
{% sandbox src="acme-dashboard-mobile" framework="tailwind" height=720 /%}
{% /mockup %}

---

### Mobile
The same metrics stacked as a single column.
{% /bento-cell %}

{% /bento %}

{% /preview %}

## How it works

The mockup's device frame is a media guest like any other — the media-zone contract sizes and clips it. Mockup is *intrinsically responsive*: its chrome and inner content scale via container queries (`cqi`) against the slot's inline size, so no `frame-aspect` is needed. A card gives it one tall slot; a bento gives it whatever each cell's track decides. Same guest, different shape.

The sandbox sources live in [`site/examples/`](/runes/sandbox#examples-directory) (`acme-landing/`, `acme-dashboard/`, `acme-dashboard-mobile/`) — Tailwind `dark:` variants flow with the preview's theme toggle, which rebuilds each iframe with the new scheme baked into its srcdoc.

## See also

- [card](/runes/card) · [bento](/runes/marketing/bento) · [mockup](/runes/design/mockup) · [sandbox](/runes/sandbox)
- [Composability contract](/extend/rune-authoring/composability)
