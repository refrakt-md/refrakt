---
title: Surface fills — tint, bg & substrate
description: The SPEC-087 surface-fill model — the three fill layers (tint, bg, substrate), the tint-tracking inset surface, and self/media-well targeting
---

# Surface fills: tint, bg & substrate

Where [surface chrome](/extend/theme-authoring/surface-chrome) gave a surface its *shadow* and *media presentation*, a surface also has a **fill**. A surface carries three independent visual layers that stack and compose — a `hero` may carry a `bg` photo, a `tint` brand colour, *and* a `substrate` dot-grid at once.

| Primitive | Answers | Mechanism | Asset? |
|-----------|---------|-----------|--------|
| `tint` | what *colour* is this surface? | bridges `--tint-*` → `--rf-color-*` (incl. surface/inset) | no — tokens |
| `bg` | what *image/video* sits behind content? | `[data-name="bg"]` positioned layer | yes — a media asset |
| `substrate` | what *texture/pattern* is on the surface? | token-generated dot/line/grid pattern | no — tokens |

`substrate` is defined by exclusion: **not** a colour role (`tint`) and **not** a media asset (`bg`). Being token-generated rather than an image is the differentiator — themeable, crisp at any size, cheap, and composable.

## substrate — generated surface pattern

The pattern vocabulary is a **fixed engine-level enum** — `dots | grid | lines | cross | checker | none` — *not* a theme preset registry (a dot is a dot on every theme). Ownership is split:

- **Engine** owns the vocabulary; **shared base CSS** (`dimensions/substrate.css`, always included — not a theme's swappable CSS) owns the token-driven gradient recipes; the **theme** tunes only the token hooks (`--substrate-ink`, cell size); **content** sets inline facets.

```
{% hero substrate="dots" substrate-size="md" %}
…
{% /hero %}
```

| Facet | Values | Effect |
|-------|--------|--------|
| `substrate` | `dots`/`grid`/`lines`/`cross`/`checker`/`none` | the pattern (engine enum) |
| `substrate-size` | `sm`/`md`/`lg` | cell size (→ `--substrate-cell`) |
| `substrate-opacity` | `sm`/`md`/`lg` | ink strength (→ `--substrate-opacity`) |
| `substrate-fill` | `inherit` (default) / `inset` | the surface token the pattern sits on (full colour stays with `tint`) |

The engine emits **markers only** — `data-substrate` + the `--substrate-*` custom properties on the target surface — and CSS draws. `--substrate-ink` resolves from `--rf-color-border` (tint-bridged), so the pattern recolours with the surface. Named recipes (a memorable bundle of pattern + facets) are a deferred **project** concern (`refrakt.config.json`), never theme config.

Each pattern on a card's self surface (the dot grid covers the whole tile):

{% preview source=true %}

{% card substrate="dots" %}
### dots
A token-generated dot grid — no image asset.
{% /card %}

{% card substrate="grid" %}
### grid
Two tiled linear-gradients.
{% /card %}

{% card substrate="lines" substrate-opacity="lg" %}
### lines
Diagonal hatching at a heavier ink strength.
{% /card %}

{% /preview %}

## Fill is target-routed — but defaults to self

[Chrome](/extend/theme-authoring/surface-chrome) routed to **self** (`elevation`) and **media** (`frame`). Fill uses the same two surfaces with the **opposite default**, because "a background" means "behind everything":

- `substrate` (and the inset fill) **default to the self surface** — a pattern on `hero`/`cta`/`feature` covers the whole banner.
- The **media well is an addressable inner surface** you opt into with `substrate-target="media"` (or by carrying the fill on a media guest).

This is why fill uses its own `RuneConfig.substrateTarget` (default `'self'`) and **not** `frameTarget`: `frameTarget(hero)` is `media`, so a media-default would wrongly scope a hero's pattern to its image. `substrateTarget` is theme-overridable; an explicit per-instance `substrate-target="self|media"` always wins and is never relocated by a theme. Targeting `media` on a rune with no media section emits a build warning.

## Inset surface — derived, tint-tracking

The recessed *inset* fill is computed **at use-site** from the in-scope surface, so it tracks `tint` automatically:

```css
background: color-mix(in oklch, var(--rf-color-surface), black var(--rf-surface-inset-shift));
```

`--rf-surface-inset-shift` is a **mix amount**, not a colour (light `5%`, dark `8%`, tunable). Mixing toward `black` in oklch lowers lightness while preserving a tinted hue. There is deliberately **no precomputed inset-*colour* token** — a static one would freeze to the untinted `:root` surface and wouldn't track tint.

Two default consumers:

- the **media well** of `card` / `bento-cell` / `recipe` / `realm` / `faction` / `playlist` — a recessed sub-surface (invisible under a full-bleed guest, visible in the gaps);
- the **`chart` / `diagram`** self surface — the standalone "darker surface".

**Nesting.** Because the inset writes `background-color` and never re-bases `--rf-color-surface`, insets **don't compound**: a re-tinted nested rune derives its inset from its *own* tint, and a chart inside an inset well lands on the *same* shade as the well. Depth is conveyed by border/elevation, not progressive darkening. `--rf-surface-inset-shift: 0` is the per-rune escape hatch.

`substrate-fill="inset"` paints the pattern over that recessed fill — the surface dips a touch darker beneath the dots (compare the two cards):

{% preview source=true %}

{% card substrate="dots" %}
### `substrate-fill="inherit"`
Dots on the card's own surface (the default).
{% /card %}

{% card substrate="dots" substrate-fill="inset" %}
### `substrate-fill="inset"`
Dots over the recessed inset fill — a touch deeper, still tint-tracking.
{% /card %}

{% /preview %}

## Case studies

- **hero / cta — pattern the whole banner.** `{% hero substrate="dots" %}` → self surface; the dot-grid covers the entire banner. (The self default is load-bearing: `frameTarget(hero)` is `media`, so a media-default would wrongly scope the pattern to the hero image.)
- **Case A — guest fills the slot with its own pattern.** `{% juxtapose substrate="dots" %}` inside a card media slot → self surface of the guest; the guest fills the slot, so its pattern covers the well without targeting it.
- **Case B — displaced guest over a dotted well.** `{% card substrate="dots" substrate-fill="inset" substrate-target="media" frame="code-peek" %}` → the dotted pattern over the inset fill paints the media well; `frame` displaces the guest over it; body copy sits on the card's clean surface.
- **chart / diagram standalone.** Default inset surface → a recessed surface that tracks the page/section tint; dropped into a card media slot, it fills the well and its inset surface shows.
