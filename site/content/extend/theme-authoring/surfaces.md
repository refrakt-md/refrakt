---
title: Surface model
description: The theme-side surface model — frame/background preset registries, frameTarget/substrateTarget routing, the inset token, host-owned clip, and the substrate ownership split (SPEC-086/087)
---

# Surface model (theme config)

Refrakt's surface system gives every rune up to two decorable surfaces — **self** (the rune box) and **media** (a `[data-section="media"]` slot) — and a fill/chrome vocabulary over them. Content authors use the attributes (see [Surfaces](/runes/surfaces)); this page covers the theme-side pieces: the preset registries, the routing config, and the tokens.

## Two surfaces, two vocabularies

| Vocabulary | Targets | Carries |
|------------|---------|---------|
| `elevation` | self | `box-shadow` (z-height) |
| `frame` | media | aspect · displace · offset · oversize · place · anchor · shadow (`drop-shadow`) |
| `substrate` / inset / `tint` / `bg` | fill | pattern, colour, image |

`elevation` (box-shadow on self) and `frame-shadow` (drop-shadow silhouette on media) never collide — different property, different surface.

## frame & background preset registries

A theme registers named `frame` presets in a `frames` registry, structurally parallel to `backgrounds`, sharing the same `extends` resolution as `bg`/`tint`:

```jsonc
// refrakt.config.json / theme config → frames
"frames": {
  "screenshot": { "shadow": "lg", "aspect": "16/9" },
  "hero-peek":  { "extends": "screenshot", "displace": "bottom", "offset": "lg" },
  "code-peek":  { "displace": "bottom-end", "offset": "md", "oversize": "1.4", "anchor": "top left" }
}
```

`frame="screenshot"` applies a preset; inline `frame-*` facets override individual facets and work standalone. `frame-offset` is a **named scale** (`none|sm|md|lg|xl` → `--rf-spacing-*`); an unknown value warns and collapses to `none`, keeping the facet family on one vocabulary.

## Routing — `frameTarget` & `substrateTarget`

`RuneConfig.frameTarget` (`'media' | 'self'`) routes frame chrome:

- defaults to `'media'` when the rune declares a media section (`sections.*: 'media'`);
- `figure` / `showcase` set `'self'` — their body *is* the media;
- `frame` on a rune with **no** frame target emits a build warning rather than guessing.

`RuneConfig.substrateTarget` (`'media' | 'self'`) routes the pattern fill — but defaults to **`'self'`** ("a background" means "behind everything"), so it is a *separate* field from `frameTarget` (a media-default would wrongly scope a `hero`'s pattern to its image). It is theme-overridable; a per-instance `substrate-target` always wins; targeting `media` on a rune with no media section warns.

## Host-owned clip

`displace`/`offset`/`oversize` move and size the guest, but whether the result spills into view or is cut belongs to the **host surface**:

- **clipping hosts** (`card` / `bento-cell` / `figure` media wells): `overflow: hidden` → a displaced/oversized guest is cropped into a *peek* (`anchor` picks the focal point);
- **breakout hosts** (`showcase`-self, a standalone section/page): `overflow: visible` → the guest spills past the edge. `offset` collapses on mobile regardless of host.

Page-level full-bleed is a `width` concern (the article named-line grid's `content|wide|full` tracks), distinct from `displace` (the local/nested breakout). For `bento`, a grid-level `frame` (and `elevation`) cascades to the cells, since heading-sugar cells have no per-cell attribute surface; `frame-aspect`/`frame-anchor` feed bento's existing `--bento-media-aspect`/`--bento-media-anchor`.

## The inset surface

The recessed inset fill is computed **at use-site** from the in-scope surface, so it tracks `tint` automatically:

```css
background: color-mix(in oklch, var(--rf-color-surface), black var(--rf-surface-inset-shift));
```

`--rf-surface-inset-shift` is a **mix amount**, not a colour (`5%` light / `8%` dark, tunable). There is deliberately **no precomputed inset-*colour* token** — a static one would freeze to the untinted `:root` surface and wouldn't track tint. It writes `background-color` only, so insets **don't compound** under nesting; `--rf-surface-inset-shift: 0` disables it per rune. Default consumers: the media wells of `card`/`bento-cell`/`recipe`/`realm`/`faction`/`playlist`, and the `chart`/`diagram` self surface (the standalone "darker surface").

## substrate ownership

`substrate` is **not** a theme preset registry — a dot is a dot on every theme. Ownership is split four ways:

- the **engine** owns the pattern enum (`dots|grid|lines|cross|checker|none`);
- a **shared base stylesheet** (`dimensions/substrate.css`, always included — not a theme's swappable CSS) owns the token-driven gradient recipes;
- the **theme** tunes only the token hooks (`--substrate-ink`, resolved from `--rf-color-border`, and the default cell size);
- the **engine** emits markers only (`data-substrate` + `--substrate-*` custom props); CSS does the drawing.

Memorable named recipes (a pattern + facets bundle) are a deferred **project** concern (`refrakt.config.json`), never theme config.

## showcase migration

`showcase` is the degenerate `frameTarget: 'self'` case — its body *is* the media slot, so it collapses into the frame model. Its bespoke attributes are **deprecated aliases** for `frame-*` (they warn for one minor release, then are removed); breakout is retained as its distinct value.

| Old (`showcase`) | New |
|------------------|-----|
| `shadow="soft\|hard\|elevated"` | `frame-shadow="sm\|md\|lg"` |
| `bleed=` | `frame-displace=` |
| `offset="<length>"` | `frame-offset="sm\|md\|lg\|xl"` (named scale; raw lengths warn) |
| `aspect=` | `frame-aspect=` |
| `place=` | `frame-place=` |

See [Surfaces](/runes/surfaces) for the content-author attribute reference and live examples.
