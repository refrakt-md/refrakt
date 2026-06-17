---
title: Surfaces
description: The surface model on one page — chrome (shadow, frame), fills (tint, substrate, gradient), cover layouts, and interaction posture, with the reference tables inline.
---

# Surfaces

Every block rune exposes one or two decorable **surfaces**, and a small, universal vocabulary styles them — the same attributes on a `card`, a `figure`, a `hero`, or a `bento-cell`. A `card`, for example, has two: its **self** surface (the card box) and a **media** surface (its image/embed slot). No per-rune attributes to learn.

| Attribute | Surface | What it does |
|-----------|---------|--------------|
| `elevation` | self | the depth of the box — recessed, flat, or lifted on a shadow |
| `prominence` | self | the weight of a section header — quiet up to display size |
| `width` | layout | how wide the rune sits in the page — contained to full-bleed |
| `frame` / `frame-*` | media | present the media — aspect, crop, silhouette shadow, displacement |
| `substrate` / `substrate-*` | self (default) | a generated pattern (dots, grid, …) |
| `tint` | colour | recolour the surface (see [tint](/runes/tint)) |
| `bg` | image | an image/video layer behind content (see [bg](/runes/bg)) |

The page walks the model along its four editorial axes:

- **Chrome** — the depth, header weight, and framing that shape a surface.
- **Fills** — the colour, pattern, and gradient layers that paint it.
- **Cover** — the poster layout, where content overlays the media.
- **Posture** — how a clickable surface treats the guests inside it.

Everything here is one or two attributes on an ordinary rune. Nothing is a bespoke component.

## Chrome — the surface axes and the frame

Three independent axes shape a rune's **self** surface, and one set of facets shapes its **media**. Two of the three — `elevation` and `prominence` — are *surface* axes: they change how the box itself reads. The third, `width`, is a *layout* axis: it changes how wide the box sits in the page. All three compose freely, so the same content rune reads as a contained card *or* a full-bleed hero with no rune fork — `{% recipe elevation="flush" width="full" prominence="display" %}` (see [the worked example](#card-vs-hero) below).

### `elevation` — the depth ladder

`elevation` is a depth ladder, from recessed to lifted:

| Rung | Surface |
|------|---------|
| `sunken` | recessed — a darker, inset fill (charts, diagrams) |
| `flush` | no boundary — sits flat on the page (hints, nav, banners) |
| `flat` | a bordered surface, no shadow — the card baseline |
| `raised` | `flat` plus a small resting shadow |
| `floating` | a larger lift |
| `overlay` | the highest z-height (menus, popovers) |

Each rune ships a sensible default — a `card` is `flat`, a `hint` is `flush`, a `chart` is `sunken` — so you only set `elevation` to deviate.

{% preview source=true %}

{% card elevation="flat" %}
### `flat`
A bordered surface, no shadow — the default card.
{% /card %}

{% card elevation="raised" %}
### `raised`
Lifted on a small resting shadow.
{% /card %}

{% card elevation="floating" %}
### `floating`
A clear float — higher z-height.
{% /card %}

{% /preview %}

> The old `elevation="none|sm|md|lg"` shadow scale is superseded. The deprecated values still resolve — `none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating` — with a build warning; run `refrakt migrate elevation <path>` to update authored content. The codemod touches the `elevation` attribute only: `frame-shadow` reuses the identical `none/sm/md/lg` values on the media surface and is left untouched.

### `prominence` — the section-header family

`prominence` scales the weight of a rune's **section header** — its title type size — without touching the rest of the surface. It applies only to runes that carry a page-section header (a title/preamble), running `quiet → normal → prominent → display`. `normal` is the rune's density default; the steps re-point the title size up or down:

{% preview source=true %}

{% section prominence="quiet" %}
## Quiet
A smaller title — recedes into a dense list.
{% /section %}

{% section prominence="display" %}
## Display
A hero-scale title.
{% /section %}

{% /preview %}

### `width` — the layout axis

`width` is not a surface treatment — it sets how wide the rune sits in the page measure: `compact | narrow | (default) | wide | full`. Because it is a *layout* axis, it composes with any `elevation`: a `flush` rune at `width="full"` becomes an edge-to-edge band, while a `flat` card at `width="wide"` breaks gently out of the text column.

### `frame` — the media surface

`elevation` and `frame-shadow` are the same physical property (a shadow) on different surfaces, so they carry two names and never collide: `elevation` lifts the **self** surface (the whole tile); `frame-shadow` traces the **media** guest's silhouette.

`frame` decorates the **media** surface. Apply a named preset (`frame="screenshot"`) or set facets inline — they also work without a preset.

| Facet | Values | Effect |
|-------|--------|--------|
| `frame-aspect` | e.g. `16/9`, `1/1` | aspect ratio |
| `frame-shadow` | `none\|sm\|md\|lg` | silhouette `drop-shadow` |
| `frame-displace` | `top\|bottom\|end\|bottom-end\|top-end` | move the guest toward an edge |
| `frame-displace-mode` | `peek` (default) `\| bleed` | how the displacement renders — see below |
| `frame-offset` | `none\|sm\|md\|lg\|xl\|2xl\|3xl\|4xl` | displacement distance (non-linear named scale: `sm`–`xl` ride block-spacing tokens, `2xl`–`4xl` ride section-spacing tokens) |
| `frame-oversize` | scale factor | guest exceeds its slot (clipped) |
| `frame-place` | `left top`, … | alignment within the slot |
| `frame-anchor` | `object-position` | crop focal point |

On a `figure` or `showcase` the frame lands on the rune itself; on a `card` or `bento-cell` it lands on the media zone. Because a card's media zone is a clipping host, a displaced or oversized guest is cropped into a *peek* rather than spilling out:

{% preview source=true %}

{% card elevation="raised" frame-aspect="16/9" frame-anchor="top" %}
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

### Peek vs bleed

`frame-displace-mode` picks the rendering model:

- **`peek`** (default) — translates the guest visually inside its frame target; the host's clip crops it into a partial reveal. Correct for `card`, `bento-cell`, and other contained wells.
- **`bleed`** — puts a negative margin on the media zone instead, so following layout pulls up and the guest sits at its natural position while the host's edge moves above it. The guest extends past the host with no gap above. Use this on section-like hosts (`hero`, `cta`) where the guest is meant to overflow downward. The host needs to unclip its media zone for the spill to be visible — `hero` does this automatically when a displaced guest is present.

The block-tier offsets (`sm`–`xl`, 0.5–3rem) suit `peek` granularity inside a card. The section-tier offsets (`2xl`–`4xl`, 4–8rem) are sized to clear a section's `padding-block` so a `bleed`-mode displacement actually overhangs the host edge.

## Card vs hero

The axes earn their keep when one content rune does two jobs. A `recipe` is a bordered card by default — `elevation="flat"` (its config default), contained width, a density-sized title:

{% preview source=true %}

{% recipe prepTime="PT5M" servings=1 difficulty="easy" %}
![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

---

A cocktail classic

## Tequila Sunrise

A layered showstopper that runs from deep orange to golden yellow.

- 60ml tequila
- 120ml fresh orange juice
- 15ml grenadine

1. Fill a tall glass with ice; pour in tequila and orange juice.
2. Pour grenadine over the back of a spoon so it sinks.
{% /recipe %}

{% /preview %}

Set three attributes and the *same* recipe becomes a full-bleed hero — `elevation="flush"` drops the card chrome, `width="full"` takes it edge-to-edge, `prominence="display"` scales the title up. No rune fork, no duplicated content — the switch is composition, not configuration:

{% preview source=true %}

{% recipe prepTime="PT5M" servings=1 difficulty="easy" elevation="flush" width="full" prominence="display" %}
![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

---

A cocktail classic

## Tequila Sunrise

A layered showstopper that runs from deep orange to golden yellow.

- 60ml tequila
- 120ml fresh orange juice
- 15ml grenadine

1. Fill a tall glass with ice; pour in tequila and orange juice.
2. Pour grenadine over the back of a spoon so it sinks.
{% /recipe %}

{% /preview %}

The same three attributes turn any page-section-header rune into a hero — a `playlist`, a `howto`, a `section`. For a poster layout where the content overlays the image instead of stacking below it, reach for [cover mode](#cover--the-poster-layout) below.

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

## Composition

Every dial here composes with a *media guest*, not just an image — a `codegroup`, `chart`, or `map` in a card's media zone takes the same `frame`, `substrate`, and cover treatments. Those patterns (including a displaced codegroup over a substrate, and a linked cover poster whose guest is demoted to a backdrop) live in [Media guests](/runes/media-guests); the demotion rule is the [interaction-posture](/extend/rune-authoring/composability#media-guest-interaction-posture) contract.

## See also

- [tint](/runes/tint) · [bg](/runes/bg) — the colour and image/gradient fill layers.
- [card → cover mode](/runes/card#cover-mode) and [recipe → cover mode](/runes/learning/recipe#cover-mode) — the poster layouts.
- [media-guest interaction posture](/extend/rune-authoring/composability#media-guest-interaction-posture) — the demotion contract.
- [Surface model](/extend/theme-authoring/surfaces) — the theme-side configuration: `frame`/`bg` preset registries, `frameTarget`/`substrateTarget` routing, the inset token, host-owned clip, and the substrate ownership split.
