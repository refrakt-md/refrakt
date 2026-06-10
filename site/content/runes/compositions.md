---
title: Compositions
description: A catalogue of concrete rune compositions — one page per pattern. The showroom companion to the composability contract.
---

# Compositions

Runes compose. An open container — a `card`, a `bento` cell, a `feature` — adapts its **slot** to whatever rune you drop in, name-agnostically; the guest just fills it. There's no per-guest CSS and no bespoke "chart card" or "map card" rune — a designed tile is a plain container fed a guest.

This is the **catalogue**: one page per pattern, each showing the Markdown you write, the rendered result, and the mechanism that makes it work. For *how* the contract works — the open-world model, interaction posture, when to reach for a context modifier — see the [Composability contract](/extend/rune-authoring/composability).

## Family A — a visual guest in a media zone

A container's leading zone (before the first `---`) is its **media zone**. The media-zone contract sizes, clips, and centres any guest that lands there, so a visual rune presents cleanly with zero extra work.

{% grid columns=2 %}

{% card href="/runes/compositions/codegroup-in-card" %}
### Code-sample card
A `codegroup` in a card → a titled, tabbed snippet.
{% /card %}

{% card href="/runes/compositions/chart-in-card" %}
### Metric card
A `chart` in a card → a single titled metric.
{% /card %}

{% card href="/runes/compositions/map-in-card" %}
### Location card
A `map` in a card → a pinned place.
{% /card %}

{% card href="/runes/compositions/diagram-in-card" %}
### Architecture card
A `diagram` in a card → a captioned diagram.
{% /card %}

{% card href="/runes/compositions/chart-in-bento" %}
### Dashboard grid
The same `chart` guest, repeated across `bento` cells.
{% /card %}

{% /grid %}

More Family-A guests — `gallery`, `embed`, `audio`/`playlist`, design `swatch`/`palette`, `timeline` — follow the identical contract and join the catalogue as they're verified.

## Surface compositions

A second axis composes the **surface treatment** of the container itself — the chrome and fills around or under the guest. These are demonstrated live, as a system, in the [surface gallery](/runes/surface-gallery):

- **Cover poster** — `media-position="cover"` overlays content on full-bleed media with a legibility scrim ([card → cover](/runes/card#cover-mode)).
- **Recipe poster** — the same cover switch in header scope ([recipe → cover](/runes/learning/recipe#cover-mode)).
- **Framed media** — `frame` facets: aspect, crop `anchor`, silhouette `frame-shadow`, displaced/`oversize` peek ([surfaces](/runes/surfaces#frame--present-the-media)).
- **Elevation vs frame-shadow** — the two non-colliding shadows ([surfaces](/runes/surfaces)).
- **Tint & substrate** — recoloured or patterned surface fills ([tint](/runes/tint), [surfaces](/runes/surfaces#substrate--a-generated-pattern)).
- **Gradient fill** — token-driven `bg` gradients behind content ([bg](/runes/bg#gradient-fill)).

## Other families

Families B–E from the composability investigation (registry-fed lists, interactive guests, page-section nesting, and more) aren't first-class yet and are intentionally **not** documented here as working — they join the catalogue once verified, one pattern per page.

## See also

- [Composability contract](/extend/rune-authoring/composability) — the open-world model behind every pattern here.
- [Surface gallery](/runes/surface-gallery) — the surface-treatment axis, shown as a system.
