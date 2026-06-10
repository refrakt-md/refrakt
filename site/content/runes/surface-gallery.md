---
title: Surface gallery
description: The surface model on one page — chrome (shadow, frame), fills (tint, substrate, gradient), cover layouts, and interaction posture, shown as a system.
---

# Surface gallery

Every block rune exposes one or two decorable **surfaces**, and a small, universal vocabulary styles them — the same attributes on a `card`, a `figure`, a `hero`, or a `bento-cell`. The [surfaces reference](/runes/surfaces) is the attribute tables; this page is the showroom. It walks the model along its four axes:

- **Chrome** — the shadows and framing that lift a surface off the page.
- **Fills** — the colour, pattern, and gradient layers that paint it.
- **Cover** — the poster layout, where content overlays the media.
- **Posture** — how a clickable surface treats the guests inside it.

Everything here is one or two attributes on an ordinary rune. Nothing is a bespoke component.

## Chrome — shadow and frame

A surface carries two independent shadows that never collide. `elevation` is the **box** shadow that floats the whole tile; `frame-shadow` is the **media** shadow that traces the silhouette of the image inside it. One lifts the card, the other lifts the photo:

{% preview source=true %}

{% card elevation="lg" %}
### `elevation="lg"`
A box shadow on the card's **self** surface — the whole tile floats.
{% /card %}

{% figure frame-shadow="lg" frame-aspect="16/9" %}
![A framed silhouette](https://picsum.photos/seed/gallerysilhouette/800/450)
{% /figure %}

{% /preview %}

`elevation` runs a named scale — `none | sm | md | lg` — on every block rune:

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

`frame` decorates the **media** surface — aspect, crop focal point (`frame-anchor`), and displacement. Because a card's media zone is a clipping host, a displaced or oversized guest is cropped into a *peek* rather than spilling out:

{% preview source=true %}

{% card elevation="md" frame-aspect="16/9" frame-anchor="top" %}
![Framed, top-anchored crop](https://picsum.photos/seed/galleryframe/800/600)
---
### Framed media
`frame-aspect` sets the shape; `frame-anchor` picks the focal point of the crop.
{% /card %}

{% card frame-aspect="16/9" frame-displace="top-end" frame-offset="md" frame-oversize="1.15" %}
![A displaced peek](https://picsum.photos/seed/gallerypeek/800/600)
---
### Displaced peek
`frame-displace` + `frame-oversize` push the guest past its slot; the host clips it to a peek.
{% /card %}

{% /preview %}

See [surfaces → frame](/runes/surfaces#frame--present-the-media) for the full facet list.

## Fills — colour, pattern, gradient

Three fill layers paint the surface itself. **`tint`** recolours a rune to a named palette — the whole surface, border, and text shift together (and `tint-mode` can pin the scheme):

{% preview source=true %}

{% card tint="dracula" %}
### `tint="dracula"`
The card adopts the named palette — surface, border, and text in one move.
{% /card %}

{% card tint="solarized" %}
### `tint="solarized"`
Same card, a different registered tint. See [tint](/runes/tint) for the palette registry.
{% /card %}

{% /preview %}

**`substrate`** prints a token-generated pattern — no image asset — from a fixed vocabulary (`dots | grid | lines | cross | checker`). `substrate-fill="inset"` lays it over a slightly recessed fill that still tracks the surface colour:

{% preview source=true %}

{% card substrate="dots" %}
### dots
A generated dot grid.
{% /card %}

{% card substrate="grid" %}
### grid
Two tiled gradients.
{% /card %}

{% card substrate="cross" substrate-fill="inset" %}
### cross · inset
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

The full fill vocabulary lives in [tint](/runes/tint), [bg](/runes/bg), and [surfaces → substrate](/runes/surfaces#substrate--a-generated-pattern).

## Cover — the poster layout

`media-position="cover"` is a one-attribute switch from a normal card into a poster: the media fills the interior and the content overlays it. Cover mode turns on a legibility **scrim** automatically, so text stays readable over any photo — a directional gradient by default, or a frosted-glass band with `scrim-type="frost"`. `content-place` anchors the overlay; `height` (or `aspect`) gives the poster its shape:

{% preview source=true %}

{% card href="/runes/learning/recipe" media-position="cover" scrim-type="frost" scrim-blur="md" height="lg" %}
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
`content-place="center center"` pins the overlay; the default gradient scrim follows it.
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

When a surface is itself a link (`href`), it becomes a single interaction target. In cover mode the media is always an inert backdrop — there are no controls to compete with the card link, so the whole poster is cleanly clickable:

{% preview source=true %}

{% card href="/runes/card" media-position="cover" scrim-type="frost" scrim-blur="md" height="md" %}
![A clickable poster](https://picsum.photos/seed/galleryposture/800/600)

---

### A linked poster
The entire surface is the link target — nothing inside competes for the click.
{% /card %}

{% /preview %}

The same principle holds outside cover mode: an *interactive* guest dropped into a linked card's media zone (a `tabs`, a live `map`, a `codegroup`) is **demoted** to presentational — its controls stop receiving pointer events and it renders its static fallback, so the click always lands on the card. A button or link in the body or footer stays live. The full model is the [media-guest interaction posture](/extend/rune-authoring/composability#media-guest-interaction-posture) contract.

## See also

- [Surfaces](/runes/surfaces) — the attribute reference for `elevation`, `frame`, and `substrate`.
- [tint](/runes/tint) · [bg](/runes/bg) — the colour and image/gradient fill layers.
- [card → cover mode](/runes/card#cover-mode) and [recipe → cover mode](/runes/learning/recipe#cover-mode) — the poster layouts.
- [Surface model](/extend/theme-authoring/surfaces) — the theme-side configuration behind all of the above.
