{% spec id="SPEC-086" status="draft" tags="chrome,runes,engine,lumina,dx" %}

# Surface chrome: elevation and frame presets

Visual chrome — shadows, crop ratios, bleed/breakout — is currently welded to
the `showcase` wrapper rune. That forces nesting (`{% showcase %}…{% /showcase %}`
around an image) for an effect that is really just *styling*, and it duplicates
attribute combinations every time. `tint` and `bg` already solved the analogous
problem for colour and background: **define a named preset once, apply it via an
attribute on any rune.** This spec brings the same model to chrome, and resolves
the ambiguity that blocks it: when a rune (like `card`) hosts media, *which
surface* does a given chrome attribute decorate?

## Overview

### The governing principle: chrome attaches to a named surface

A rune can expose more than one surface that accepts chrome. A `card` exposes
two:

- **self** — the card box (background, border, radius, shadow).
- **media** — the `[data-section="media"]` slot and its guest (crop, bleed, offset, placement).

Ambiguity is removed by putting the target in the attribute's *vocabulary*, never
inferring it. Two vocabularies, two surfaces:

| Vocabulary  | Targets the rune's… | Carries                                   | Valid where                     |
|-------------|---------------------|-------------------------------------------|---------------------------------|
| `elevation` | **self** surface    | shadow (z-height, `box-shadow`)           | universal — anything can float  |
| `frame`     | **media** surface   | aspect · bleed · offset · place · shadow  | runes that declare a frame target |

```
{% card elevation="md" frame="screenshot" %}
![Dashboard](dashboard.png)
---
Body copy.
{% /card %}
```

`elevation` floats the card; `frame` presents the media. There is **never a bare
`shadow`** whose target must be guessed — the card's z-shadow is `elevation`; the
photo's silhouette drop-shadow is a *facet inside* `frame`. Same physical
property, two names, because they are two surfaces.

### Why `showcase` collapses into this

`showcase` is simply *a rune whose self surface IS a media slot* — its body is
the media. So `frame` on a card targets the card's media zone; `frame` on a
`showcase` targets its own viewport. **Same attribute**, because each rune
declares its frame target in config. Showcase stops being a special chrome
wrapper and becomes the degenerate `frameTarget: 'self'` case; its only
irreducible job — relational `bleed` past a clipping ancestor when there is no
host rune to carry the attribute — remains honest wrapper work.

This also unifies the three runes that motivated the design:

- **card** → `elevation` = card shadow; `frame` = hosted image (aspect/bleed/offset). Two surfaces, two vocabularies.
- **figure** → it *is* a frame around an image, so `frameTarget: 'self'`: `frame` presents the image, `elevation` lifts the figure.
- **showcase** → `frameTarget: 'self'`; `frame` does everything, breakout `bleed` is its unique value.

## Design

### 1. `elevation` — universal self-surface shadow

- New **universal attribute** `elevation` (joins `tint`, `bg`, `width`, `spacing`, `inset` in `UNIVERSAL_ATTRIBUTE_NAMES`). Values: `none | sm | md | lg`.
- Backed by a shared token scale `--rf-shadow-none | --rf-shadow-sm | --rf-shadow-md | --rf-shadow-lg` (extends today's `--rf-shadow-sm/md`). The engine sets `data-elevation`; CSS maps it to `box-shadow: var(--rf-shadow-{level})`.
- Existing per-rune shadows are migrated to reference the scale: `figure` (`--rf-shadow-sm`), `codegroup` (`--rf-shadow-md`), `card`, etc. — one scale, no bespoke values.
- `elevation` is always `box-shadow` (the object floats as a rectangle). The silhouette-hugging `drop-shadow` lives only in `frame`'s shadow facet (§2), so the two never collide.

### 2. `frame` — media-surface preset, modelled on `bg`

- New theme-config registry `frames`, structurally parallel to `backgrounds`:
  ```ts
  interface FramePresetDefinition {
    aspect?: string;   // "16/9", "1/1"
    bleed?: string;    // none | top | bottom | both | end | bottom-end | top-end
    offset?: string;   // bleed distance, CSS length
    place?: string;    // left|center|right × top|bottom
    shadow?: string;   // none|sm|md|lg — rendered as drop-shadow (silhouette)
    extends?: string;  // layer onto a base preset (same `extends` resolution as bg/tint)
  }
  ```
  ```jsonc
  "frames": {
    "screenshot": { "shadow": "lg", "aspect": "16/9" },
    "hero-peek":  { "extends": "screenshot", "bleed": "bottom", "offset": "3rem" }
  }
  ```
- Applied via `frame="screenshot"`, with **inline facet overrides** mirroring `bg`'s inline overrides: `frame-aspect`, `frame-bleed`, `frame-offset`, `frame-place`, `frame-shadow`. Inline values override the named preset's facets; a preset is optional (facets work standalone).
- Engine pipeline reuses the `bg` machinery (`packages/transform/src/engine.ts` bg resolution, `BgPresetDefinition`, `merge.ts` `extends` resolution): read meta → look up `frames` → resolve `extends` → emit `data-aspect`, `data-bleed`, `data-frame-shadow`, and `--frame-offset` / `--frame-place-*` custom properties onto the **frame-target element**.

### 3. `frameTarget` — the unambiguity backbone

- New `RuneConfig.frameTarget?: 'media' | 'self'`.
  - Defaults to `'media'` when the rune declares a media section (`sections.media` / emits `data-section="media"`).
  - `showcase` and `figure` set `'self'` (the rune's own root is the frame).
- `frame` is universally *accepted* but validated against `frameTarget`: applied on a rune with no frame target → **build warning** (not a silent guess), consistent with the composability-contract validation philosophy (SPEC-084).
- The frame chrome lands on the resolved surface: the `[data-section="media"]` zone (reusing the WORK-339 media-zone contract — it already clips, rounds, and is a container-query context) or the rune root for `self`.

### 4. Relational `bleed` is spec'd as context-relative

`bleed`/`offset` only mean something relative to a **clipping ancestor**, so the
spec states this explicitly rather than pretending it is symmetric with the
intrinsic facets:

- `bleed` overflows the nearest clipping context: the card edge, a bento cell (clipped to a peek — existing `--in-bento-cell` behaviour), or the page/section when standalone.
- `offset` is the displacement distance; bleed collapses on mobile (existing showcase behaviour).
- This is the one facet that keeps `showcase`-as-wrapper meaningful for standalone breakout, because a bare markdown image has no attribute surface to carry it and no host rune to push it onto.

### 5. Migration (breaking)

`showcase`'s bespoke attributes become `frame` facets. Provide deprecated
aliases for one minor release with a build warning, then remove:

| Old (`showcase`)      | New                                  |
|-----------------------|--------------------------------------|
| `shadow="soft"`       | `frame-shadow="sm"`                  |
| `shadow="hard"`       | `frame-shadow="md"`                  |
| `shadow="elevated"`   | `frame-shadow="lg"`                  |
| `bleed=` / `offset=`  | `frame-bleed=` / `frame-offset=`     |
| `aspect=`             | `frame-aspect=`                      |
| `place=`              | `frame-place=`                       |

Changesets: `@refrakt-md/runes` + `@refrakt-md/lumina` (minor for `elevation` /
`frames`; the showcase attribute rename is the breaking part — gated behind
aliases so the major can land later).

## Acceptance Criteria

- [ ] `elevation` is a universal attribute (`none|sm|md|lg`) on all block runes, backed by a `--rf-shadow-*` token scale; `figure`/`codegroup`/`card` reference the scale instead of bespoke shadow values.
- [ ] A `frames` preset registry exists in theme config, structurally parallel to `backgrounds`, with `extends` resolution shared with `bg`/`tint`.
- [ ] `frame="preset"` applies a named preset; inline `frame-aspect|bleed|offset|place|shadow` override individual facets and work without a preset.
- [ ] `RuneConfig.frameTarget` (`'media' | 'self'`, defaulting to `'media'` when a media section exists) routes frame chrome to the correct surface; `card` → media zone, `figure`/`showcase` → self.
- [ ] `frame` on a rune with no frame target emits a build warning rather than applying ambiguously.
- [ ] The frame shadow facet renders as `drop-shadow` (silhouette); `elevation` renders as `box-shadow` (box) — they never collide on the same surface.
- [ ] `bleed`/`offset` are documented as context-relative (clip against nearest clipping ancestor; peek in a bento cell; collapse on mobile).
- [ ] `showcase` is re-expressed as `frameTarget: 'self'` consuming `frame`; its old `shadow|bleed|offset|aspect|place` attributes are deprecated aliases (warn) per the migration table, with breakout `bleed` retained as its distinct value.
- [ ] Card/figure/showcase/bento reference docs and a theme-authoring "frames" section document the surface model (`elevation` = self, `frame` = media) and the preset registry.

## Work breakdown (provisional)

1. **`elevation` + `--rf-shadow-*` scale** — universal attribute, token scale, migrate existing shadows.
2. **`frames` registry + `frame` attribute + inline overrides** — types + engine, modelled on `bg`.
3. **`frameTarget` routing** — config field, media-zone vs self binding, build-time validation; move aspect/bleed/offset/place CSS into a shared frame layer.
4. **Collapse `showcase` into the frame model** — `frameTarget: 'self'`, deprecated aliases, migration, breakout `bleed` retained.
5. **Docs** — surface-model authoring page + card/figure/showcase/bento reference updates + theme-authoring `frames` section.

## References

- Preset template: `bg` pipeline — `packages/transform/src/engine.ts` (bg resolution), `BgPresetDefinition`/`ThemeConfig` in `packages/transform/src/types.ts`, `extends` resolution in `packages/transform/src/merge.ts`, `packages/lumina/styles/runes/bg.css`.
- Universal attributes: `packages/runes/src/attribute-presets.ts` (`UNIVERSAL_ATTRIBUTE_NAMES`).
- Surface to decorate: media-zone contract {% ref "WORK-339" /%}; composability validation philosophy {% ref "SPEC-084" /%}.
- Current chrome to absorb: `packages/runes/src/tags/showcase.ts`, `Showcase` config in `packages/runes/src/config.ts`, `packages/lumina/styles/runes/showcase.css`, media rules in `packages/lumina/styles/layouts/split.css`.

{% /spec %}
