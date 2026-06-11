---
title: Media guests
description: Drop any rune into a container's media zone — charts, maps, diagrams, code, comparisons, device mockups. The slot sizes and clips them, name-agnostically.
---

# Media guests

An open container — a `card`, a `bento` cell, a `feature` — adapts its **slot** to whatever rune you drop in, name-agnostically; the guest just fills it. There's no per-guest CSS and no bespoke "chart card" or "map card" rune — a designed tile is a plain container fed a guest.

The container's leading zone (before the first `---`) is its **media zone**, and the media-zone contract sizes, clips, and centres any guest that lands there. This page catalogues the patterns. For *how* the contract works — the open-world model, when a guest opts out of the clip, the interaction-posture rule — see the [Composability contract](/extend/rune-authoring/composability). To decorate the surface *around* the guest (frame, cover, tint, gradient), see [Surfaces](/runes/surfaces).

## Visual data guests

A chart, diagram, or map needs no wrapper — the slot sizes it, a title and note sit below the `---`.

### Metric card

A `{% chart %}` fills the media well; the same plain `card`, only the guest changed.

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

Drop the same chart into a `bento` cell and you get a [dashboard grid](#dashboard-grid) — same guest, different container.

### Architecture card

A `{% diagram %}` renders to inline SVG, then the slot sizes it. It's non-interactive, so it composes the same whether or not the card links.

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

### Location card

A `{% map %}` fills the media well with its pins. Because this card has no `href`, the map stays **interactive** — pan and zoom work (see *Interactive guests & posture*, below).

{% preview source=true %}

{% card frame-aspect="3/2" %}
{% map zoom="13" center="48.8566, 2.3522" %}
- **Louvre Museum** - *World's largest art museum* - 48.8606, 2.3376
- **Notre-Dame** - *Medieval cathedral* - 48.8530, 2.3499
{% /map %}

---

### Île de la Cité
Two landmarks on the Seine.
{% /card %}

{% /preview %}

### Dashboard grid

The same chart guest, repeated across `{% bento-cell %}`s. A bento cell adopts `card`'s zone contract — content splits on `---` into media / body / footer — so a chart in the leading zone is a media guest exactly as in the metric card. Uniform row tracks keep the tiles aligned.

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

## Code & comparison

### Code-sample card

A `{% codegroup %}` in the media zone is a tabbed snippet up top, a title and blurb below. With no `href` the tabs stay interactive.

{% preview source=true %}

{% card %}
{% codegroup %}
```js
export const sum = (a, b) => a + b;
```
```py
def sum(a, b): return a + b
```
{% /codegroup %}

---

### Tiny utilities
A starter kit of one-liners.
{% /card %}

{% /preview %}

### Comparison card

A `{% juxtapose %}` is a draggable before/after; the two panels are its `---` split and hold *anything* — two images for a photo comparison, or two `sandbox`es with opposite `tint-mode` for a live light/dark view.

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

Juxtapose opts out of the slot's clip and container query so its slider chrome sizes to its own panels — but it keeps the slot's rounded corners and drops its own border/background/radius for the slot's media radius, so it reads as one surface, not two (the same double-chrome resolution `chart` and `diagram` use).

## Device & presentation

### Mockup

A `{% mockup %}` (with a `{% sandbox %}` inside) is a media guest like any other — a single product tile in a card, or a multi-device gallery in a bento. Mockup is *intrinsically responsive*: its chrome and content scale via container queries (`cqi`) against the slot, so no `frame-aspect` is needed.

{% preview source=true %}

{% card %}
{% mockup device="browser" url="acme.io" %}
{% sandbox src="acme-landing" framework="tailwind" height=420 /%}
{% /mockup %}

---

### Acme landing page
The production homepage, framed in browser chrome for the docs.
{% /card %}

{% /preview %}

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

The sandbox sources live in [`site/examples/`](/runes/sandbox#examples-directory) — Tailwind `dark:` variants flow with the preview's theme toggle, which rebuilds each iframe with the new scheme baked into its srcdoc.

## Interactive guests & posture

Most guests are presentational, but some are interactive — a `map`, a `codegroup`, a `juxtapose`, a `sandbox`. Whether they stay live depends on the host:

- In a **plain** card or cell (no `href`, not cover), an interactive guest stays fully interactive — the map pans, the slider drags, the tabs switch. Every live example above relies on this.
- A **linked** card (`href`) is one click target, so its media guest is **demoted** to a static fallback (`pointer-events: none`) and the click lands on the card.
- In **cover** mode the guest is always an inert backdrop.

The demotion is scoped to the media zone only — a button or link in the body/footer stays live. The full model is the [media-guest interaction posture](/extend/rune-authoring/composability#media-guest-interaction-posture) contract.

## More guests

Any visual rune follows the same contract — `gallery`, `embed`, `audio`/`playlist`, design `swatch`/`palette`, `timeline` — and joins this page as it's verified. Two further composition families will arrive as their own pages under Essentials: **registry-fed** (`collection`/`aggregate`) and **layout signatures** (`bento`/`showcase` grids).

## See also

- [Composability contract](/extend/rune-authoring/composability) — the open-world model and interaction posture behind every pattern here.
- [Surfaces](/runes/surfaces) — decorating the surface *around* the guest: frame, cover, tint, gradient.
- [card](/runes/card) · [bento](/runes/marketing/bento) — the common host containers.
