---
title: Comparison card
description: A juxtapose in a card's media zone — a draggable before/after presented as a card.
---

# Comparison card

A `{% juxtapose %}` in a card's media zone is a comparison card: the draggable slider sits at the top, a title and pitch below. The handle stays usable, the labels stay visible — and the two panels can hold anything juxtapose can, not just images.

## Before / after photos

The classic case: two stills with a draggable divider. Markdown images go straight in.

{% preview source=true %}

{% card %}
{% juxtapose labels="Summer, Winter" %}

![Oak tree summer](https://assets.refrakt.md/oak-tree-summer.png)

---

![Oak tree winter](https://assets.refrakt.md/oak-tree-winter.png)

{% /juxtapose %}

---

### Same tree, two seasons
Drag the divider to flip between July and February.
{% /card %}

{% /preview %}

## Light / dark UI

Drop two `{% sandbox %}` panels with `tint-mode` locked to opposite schemes and the slider becomes a live theme comparison — useful when you want to show both modes of a design at once without relying on the reader's own theme toggle.

{% preview source=true %}

{% card %}
{% juxtapose labels="Light, Dark" %}

{% sandbox src="profile-card" framework="tailwind" tint-mode="light" /%}

---

{% sandbox src="profile-card" framework="tailwind" tint-mode="dark" /%}

{% /juxtapose %}

---

### Profile card, both modes
The shared `profile-card` example — left panel pinned to light, right to dark.
{% /card %}

{% /preview %}

## How it works

Most media guests sit *inside* the slot's clip — the media-zone contract gives them `overflow: hidden`, `container-type: inline-size`, and the smaller media radius, then they fill it. Juxtapose opts out of the clip and the container query so its inner slider chrome can size against its own panels, not the slot. It *keeps* the slot's rounded corners, though, because juxtapose still wants to read as part of the card surface.

The double-chrome problem (juxtapose has its own border + background + radius on `.rf-juxtapose__panels`, the slot has its own border + recessed background + radius too) is resolved the same way chart and diagram handle it: when juxtapose is a media guest, its `__panels` self-chrome is dropped and it adopts the slot's media radius. One surface, not two.

The two panels are juxtapose's `---` split; *anything* goes in either side. Two `<img>`s give you a before/after photo; two `{% sandbox %}`s with opposite `tint-mode` give you a light/dark UI comparison. The card around them doesn't know or care which.

Because these cards have no `href`, the slider stays draggable. The interaction-posture contract would otherwise demote it; see [Composability contract → media-guest interaction posture](/extend/rune-authoring/composability#media-guest-interaction-posture).

## See also

- [card](/runes/card) · [juxtapose](/runes/juxtapose) · [sandbox](/runes/sandbox)
- [Composability contract](/extend/rune-authoring/composability)
