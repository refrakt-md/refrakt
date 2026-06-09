---
title: Surface chrome — elevation & frames
description: The SPEC-086 surface model — elevation (self-surface shadow) and frame (media-surface preset) chrome, the frameTarget routing, host-owned clip, and the showcase migration
---

# Surface chrome: elevation & frames

A rune can expose more than one surface that accepts chrome. A `card` exposes two:

- **self** — the card box (background, border, radius, shadow).
- **media** — the `[data-section="media"]` slot and its guest (crop, bleed, offset, placement).

Ambiguity is removed by putting the target in the attribute's *vocabulary*, never inferring it. Two vocabularies, two surfaces:

| Vocabulary  | Targets the rune's… | Carries | Valid where |
|-------------|---------------------|---------|-------------|
| `elevation` | **self** surface | shadow (z-height, `box-shadow`) | universal — anything can float |
| `frame`     | **media** surface | aspect · displace · offset · oversize · place · anchor · shadow | runes that declare a frame target |

```
{% card elevation="md" frame="screenshot" %}
![Dashboard](dashboard.png)
---
Body copy.
{% /card %}
```

`elevation` floats the card; `frame` presents the media. There is never a bare `shadow` whose target must be guessed — the card's z-shadow is `elevation` (a `box-shadow`); the photo's silhouette drop-shadow is a facet *inside* `frame`. Same physical property, two names, because they are two surfaces — and they never collide.

## elevation — universal self-surface shadow

`elevation` is a [universal attribute](/extend/theme-authoring/config-api) (`none | sm | md | lg`) available on every block rune. The engine emits `data-elevation`; CSS maps it to `box-shadow: var(--rf-shadow-{level})` against the shared `--rf-shadow-*` token scale. `elevation="none"` explicitly flattens a rune's default shadow.

{% preview source=true %}

{% card elevation="sm" %}
### `elevation="sm"`
A lightly lifted card.
{% /card %}

{% card elevation="lg" %}
### `elevation="lg"`
A more pronounced float — same `box-shadow` scale, higher z-height.
{% /card %}

{% /preview %}

## frame — media-surface preset

`frame` presents the media surface, modelled on `bg`. A theme registers named presets in a `frames` registry (structurally parallel to `backgrounds`), with `extends` resolution shared with `bg`/`tint`:

```jsonc
// refrakt.config.json / theme config → frames
"frames": {
  "screenshot": { "shadow": "lg", "aspect": "16/9" },
  "hero-peek":  { "extends": "screenshot", "displace": "bottom", "offset": "lg" },
  "code-peek":  { "displace": "bottom-end", "offset": "md", "oversize": "1.4", "anchor": "top left" }
}
```

Apply a preset with `frame="screenshot"`, and override individual facets inline — the facets also work standalone, with no preset:

| Facet | Inline attribute | Notes |
|-------|------------------|-------|
| aspect | `frame-aspect` | e.g. `16/9`, `1/1` |
| displace | `frame-displace` | `top \| bottom \| end \| bottom-end \| top-end` |
| offset | `frame-offset` | named scale `none \| sm \| md \| lg \| xl` (→ `--rf-spacing-*`) |
| oversize | `frame-oversize` | scale factor; clipped guests only |
| place | `frame-place` | guest-box alignment (`left top`, …) |
| anchor | `frame-anchor` | crop focal point (`object-position`) |
| shadow | `frame-shadow` | `none \| sm \| md \| lg` — rendered as a silhouette `drop-shadow` |

`offset` is a **named scale** (not a raw length): an unknown value warns and collapses to `none`, keeping the frame facet family on one vocabulary alongside `frame-shadow`/`elevation`.

A `figure` is `frameTarget: 'self'`, so its `frame-*` facets land on the figure itself:

{% preview source=true %}

{% figure frame-shadow="lg" frame-aspect="16/9" %}
![Framed media](https://picsum.photos/seed/framechrome/800/450)
{% /figure %}

{% /preview %}

On a `card` (`frameTarget: 'media'`) the same facets decorate the media zone instead, while `elevation` floats the card box:

{% preview source=true %}

{% card elevation="md" frame-aspect="16/9" frame-anchor="center" %}
![Cover](https://picsum.photos/seed/cardframe/800/450)
---
### Two surfaces
`elevation` floats the card; `frame-*` presents the image in its media zone.
{% /card %}

{% /preview %}

## frameTarget — the unambiguity backbone

`RuneConfig.frameTarget` (`'media' | 'self'`) routes frame chrome to the correct surface:

- Defaults to `'media'` when the rune declares a media section (`sections.*: 'media'`), landing the chrome on the `[data-section="media"]` zone.
- `figure` and `showcase` set `'self'` — the rune's own root *is* the media.
- `frame` on a rune with **no** frame target emits a build warning rather than guessing.

## Host-owned clip — displacement is guest-owned, clip is host-owned

`displace`/`offset`/`oversize` move and size the guest, but whether the result spills into view or is cut belongs to the **host surface**, not the guest. The same displaced guest reads as a **bleed** in a non-clipping host and a **peek** in a clipping one:

- **Clipping hosts** (`card` / `bento-cell` / `figure` media wells): `overflow: hidden` — a displaced/oversized guest is cropped (a window onto something larger); `anchor` picks the focal point.
- **Breakout hosts** (`showcase` as `frameTarget: 'self'`, or a standalone section/page): `overflow: visible` — the displaced guest spills past the edge. `offset` collapses on mobile regardless of host.

> Page-level full-bleed is a `width` concern (the article named-line grid's `content|wide|full` tracks), distinct from `displace` (the local/nested breakout). `showcase`/`figure` is the attribute-surface wrapper that lets a bare image carry `width="full"` (top-level) or `frame`/`displace` (nested) — not a separate breakout primitive.

## showcase — the degenerate `frameTarget: 'self'` case

`showcase` is simply a rune whose self surface *is* a media slot, so it collapses into the frame model. Its bespoke attributes are **deprecated aliases** for `frame-*` facets (they warn for one minor release, then are removed); breakout is retained as its distinct value.

| Old (`showcase`) | New |
|------------------|-----|
| `shadow="soft"` | `frame-shadow="sm"` |
| `shadow="hard"` | `frame-shadow="md"` |
| `shadow="elevated"` | `frame-shadow="lg"` |
| `bleed=` | `frame-displace=` |
| `offset="<length>"` | `frame-offset="sm\|md\|lg\|xl"` (named scale; raw lengths warn) |
| `aspect=` | `frame-aspect=` |
| `place=` | `frame-place=` |
