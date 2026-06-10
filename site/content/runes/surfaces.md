---
title: Surfaces
description: The surface model on one page — chrome (shadow, frame), fills (tint, substrate, gradient), cover layouts, and interaction posture, with the reference tables inline.
---

# Surfaces

Every block rune exposes one or two decorable **surfaces**, and a small, universal vocabulary styles them — the same attributes on a `card`, a `figure`, a `hero`, or a `bento-cell`. A `card`, for example, has two: its **self** surface (the card box) and a **media** surface (its image/embed slot). No per-rune attributes to learn.

| Attribute | Surface | What it does |
|-----------|---------|--------------|
| `elevation` | self | a `box-shadow` that floats the box |
| `frame` / `frame-*` | media | present the media — aspect, crop, silhouette shadow, displacement |
| `substrate` / `substrate-*` | self (default) | a generated pattern (dots, grid, …) |
| `tint` | colour | recolour the surface (see [tint](/runes/tint)) |
| `bg` | image | an image/video layer behind content (see [bg](/runes/bg)) |

The page walks the model along its four axes:

- **Chrome** — the shadows and framing that lift a surface off the page.
- **Fills** — the colour, pattern, and gradient layers that paint it.
- **Cover** — the poster layout, where content overlays the media.
- **Posture** — how a clickable surface treats the guests inside it.

Everything here is one or two attributes on an ordinary rune. Nothing is a bespoke component.

## Chrome — shadow and frame

A surface decorates on two layers. The **self** layer is the whole tile — `elevation` lifts it as a box shadow. The **media** layer is the framed image inside — `frame-*` attributes shape it (`frame-aspect`), anchor the crop (`frame-anchor`), displace it past the slot (`frame-displace`), and shadow it (`frame-shadow`). `elevation` and `frame-shadow` are the same physical property (a shadow) on different surfaces, so they carry two names and never collide:

{% preview source=true %}

{% card elevation="lg" %}
### `elevation="lg"`
A box shadow on the card's **self** surface — the whole tile floats.
{% /card %}

{% figure frame-aspect="16/9" caption="`frame-aspect` sets the framed media's shape; the image fills it via `object-fit: cover`." %}
![A framed image](https://picsum.photos/seed/gallerysilhouette/800/450)
{% /figure %}

{% /preview %}

`elevation` runs a named scale — `none | sm | md | lg` — on every block rune. `elevation="none"` flattens a rune's default shadow.

{% preview source=true %}

{% card elevation="sm" %}
### `sm`
Barely lifted.
{% /card %}

{% card elevation="md" %}
### `md`
A clear float.
{% /card %}

{% card elevation="lg" %}
### `lg`
Highest z-height.
{% /card %}

{% /preview %}

`frame` decorates the **media** surface. Apply a named preset (`frame="screenshot"`) or set facets inline — they also work without a preset.

| Facet | Values | Effect |
|-------|--------|--------|
| `frame-aspect` | e.g. `16/9`, `1/1` | aspect ratio |
| `frame-shadow` | `none\|sm\|md\|lg` | silhouette `drop-shadow` |
| `frame-displace` | `top\|bottom\|end\|bottom-end\|top-end` | move the guest toward an edge |
| `frame-offset` | `none\|sm\|md\|lg\|xl` | displacement distance (named scale) |
| `frame-oversize` | scale factor | guest exceeds its slot (clipped) |
| `frame-place` | `left top`, … | alignment within the slot |
| `frame-anchor` | `object-position` | crop focal point |

On a `figure` or `showcase` the frame lands on the rune itself; on a `card` or `bento-cell` it lands on the media zone. Because a card's media zone is a clipping host, a displaced or oversized guest is cropped into a *peek* rather than spilling out:

{% preview source=true %}

{% card elevation="md" frame-aspect="16/9" frame-anchor="top" %}
![Framed, top-anchored crop](https://picsum.photos/seed/galleryframe/800/600)
---
### Framed media
`frame-aspect` sets the shape; `frame-anchor` picks the focal point of the crop.
{% /card %}

{% card frame-aspect="16/9" frame-displace="top-end" frame-offset="md" frame-oversize="1.15" frame-shadow="md" %}
![A displaced peek with silhouette shadow](https://picsum.photos/seed/gallerypeek/800/600)
---
### Displaced peek + silhouette shadow
`frame-displace` + `frame-oversize` push the guest past its slot; the host clips it to a peek, and `frame-shadow` traces the cropped silhouette — not the card.
{% /card %}

{% /preview %}

Whether a displaced or oversized guest spills out or is cropped into a peek is decided by the **host**, not the guest — see [host-owned clip](/extend/theme-authoring/surfaces#host-owned-clip).

## Fills — colour, pattern, gradient

Three fill layers paint the surface itself. **`tint`** recolours a rune to a named palette — the whole surface, border, and text shift together (and `tint-mode` can pin the scheme):

{% preview source=true %}

{% card tint="catppuccin" %}
### `tint="catppuccin"`
The card adopts the named palette — surface, border, and text in one move.
{% /card %}

{% card tint="solarized" %}
### `tint="solarized"`
Same card, a different registered tint. See [tint](/runes/tint) for the palette registry.
{% /card %}

{% /preview %}

**`substrate`** prints a token-generated pattern — no image asset — from a fixed vocabulary.

| Facet | Values | Effect |
|-------|--------|--------|
| `substrate` | `dots\|grid\|lines\|cross\|checker\|none` | the pattern |
| `substrate-size` | `sm\|md\|lg` | cell size |
| `substrate-opacity` | `sm\|md\|lg` | ink strength |
| `substrate-fill` | `inherit` (default) / `inset` | sit on the surface, or the recessed inset fill |

A substrate fills the rune's **self** surface by default — a banner pattern covers the whole banner. Opt into the media well with `substrate-target="media"`. `substrate-fill="inset"` lays it over a slightly recessed fill that still tracks the surface colour:

{% preview source=true %}

{% card substrate="dots" %}
### dots
A generated dot grid — default size and opacity.
{% /card %}

{% card substrate="grid" %}
### grid
Two tiled gradients.
{% /card %}

{% card substrate="lines" substrate-opacity="lg" %}
### lines · opacity="lg"
Diagonal hatching at heavier ink strength.
{% /card %}

{% card substrate="checker" substrate-size="lg" %}
### checker · size="lg"
Alternating filled cells, scaled up via `substrate-size`.
{% /card %}

{% card substrate="cross" substrate-fill="inset" %}
### cross · fill="inset"
Pattern over a recessed, tint-tracking fill.
{% /card %}

{% /preview %}

**Gradient fills** are token-driven — `from`/`to` take semantic colour names that resolve to `var(--rf-color-*)`, so the gradient tracks the theme. A gradient-only card needs an intrinsic `height` to show:

{% preview source=true %}

{% card height="md" bg-gradient="to-br" bg-from="primary" bg-to="info" %}
### Gradient fill
A two-stop linear gradient from token colours — no image needed.
{% /card %}

{% card height="md" bg-gradient="to-t" bg-from="surface" bg-via="primary" bg-to="info" bg-gradient-type="radial" %}
### Radial, three stops
`bg-gradient-type="radial"` with a `via` middle stop.
{% /card %}

{% /preview %}

The full fill vocabulary lives in [tint](/runes/tint) and [bg](/runes/bg).

## Cover — the poster layout

`media-position="cover"` is a one-attribute switch from a normal card into a poster: the media fills the interior and the content overlays it. Cover mode turns on a legibility **scrim** automatically, so text stays readable over any photo — a directional gradient by default, or a frosted-glass band with `scrim-type="frost"`. `content-place` anchors the overlay; `height` (or `aspect`) gives the poster its shape:

{% preview source=true %}

{% card href="/runes/learning/recipe" media-position="cover" height="lg" %}
![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

---

Brunch classic

### Tequila Sunrise
A bright, layered cocktail — five minutes, no shaker.
{% /card %}

{% card media-position="cover" content-place="center center" height="lg" %}
![A coastal scene](https://picsum.photos/seed/gallerycover/800/1000)

---

### Centred hero
`content-place="center center"` pins the overlay; the gradient scrim follows as a centred radial spot.
{% /card %}

{% /preview %}

A `recipe` uses **header scope**: the same `media-position="cover"` switch, but only the title block overlays the image while the ingredients and steps flow below on the page palette:

{% preview source=true %}

{% recipe prepTime="PT5M" servings=1 difficulty="easy" media-position="cover" scrim-type="frost" scrim-blur="md" %}
![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

---

A cocktail classic

## Tequila Sunrise

A layered showstopper that transitions from deep orange to golden yellow.

- 60ml tequila
- 120ml fresh orange juice
- 15ml grenadine
- Orange slice and cherry to garnish

1. Fill a tall glass with ice; pour in tequila and orange juice. Stir gently.
2. Slowly pour grenadine over the back of a spoon so it sinks.
3. Let the layers settle, then garnish.
{% /recipe %}

{% /preview %}

The cover scrim, `content-place`, and `scrim-type` are documented on [card → cover mode](/runes/card#cover-mode).

## Posture — one interaction target

When a surface is itself a link (`href`), it becomes a single interaction target. Any normally-interactive guest in the media zone — a `tabs`, a live `map`, a `codegroup` — is **demoted** to presentational so the click always lands on the card. The map below would normally pan and zoom on its own; inside this linked cover card its controls are silent, and the whole poster reads as one clickable surface:

{% preview source=true %}

{% card href="/runes/places/map" media-position="cover" height="md" %}
{% map zoom="12" center="48.8566, 2.3522" %}
- **Paris** - *Demoted to a backdrop* - 48.8566, 2.3522
{% /map %}

---

### A linked poster, with a live guest
The map below would normally pan and zoom; inside a linked card its controls go silent, so the whole surface stays a single click target.
{% /card %}

{% /preview %}

The same principle holds outside cover mode — a button or link in the body or footer of a linked card stays live, only the **media-zone** guest is demoted. The full model is the [media-guest interaction posture](/extend/rune-authoring/composability#media-guest-interaction-posture) contract.

## Composition

All the dials compose. The frame vocabulary doesn't know or care that its guest is an image — drop a `codegroup` into the media slot and the same `frame-displace` / `frame-oversize` work. `substrate-target="media"` routes the cross pattern to the media well, and the displaced guest reveals it in the top-left strip the codegroup no longer covers:

{% preview source=true %}

{% card frame-aspect="3/2" frame-displace="bottom-end" frame-offset="md" frame-oversize="1.15" substrate="cross" substrate-target="media" %}
{% codegroup title="refrakt.config.ts" %}
```ts
import { defineConfig } from '@refrakt-md/cli';
import marketing from '@refrakt-md/marketing';
import learning from '@refrakt-md/learning';
import storytelling from '@refrakt-md/storytelling';

export default defineConfig({
  content: './content',
  theme: '@refrakt-md/lumina',
  plugins: [
    marketing(),
    learning(),
    storytelling(),
  ],
  surfaces: {
    card: {
      elevation: 'md',
      frame: { aspect: '16/9' },
    },
    figure: {
      frame: { shadow: 'lg', anchor: 'top' },
    },
  },
});
```
{% /codegroup %}

---

### Codegroup over a substrate
The codegroup oversizes and displaces toward the bottom-right; the cross substrate fills the media slot beneath and shows through the strip the codegroup no longer covers.
{% /card %}

{% /preview %}

## See also

- [tint](/runes/tint) · [bg](/runes/bg) — the colour and image/gradient fill layers.
- [card → cover mode](/runes/card#cover-mode) and [recipe → cover mode](/runes/learning/recipe#cover-mode) — the poster layouts.
- [media-guest interaction posture](/extend/rune-authoring/composability#media-guest-interaction-posture) — the demotion contract.
- [Surface model](/extend/theme-authoring/surfaces) — the theme-side configuration: `frame`/`bg` preset registries, `frameTarget`/`substrateTarget` routing, the inset token, host-owned clip, and the substrate ownership split.
