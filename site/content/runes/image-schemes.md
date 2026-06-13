---
title: Image schemes
description: Custom URL schemes in Markdown image syntax — generated placeholders and inline icons resolved at build time to inline SVG.
category: Content
plugin: core
status: stable
type: guide
---

# Image schemes

Standard Markdown image syntax — `![alt](src)` — gains two **custom URL
schemes** in the `src`, resolved during the transform into inline SVG:

| Syntax | Resolves to |
|--------|-------------|
| `![Portrait](placeholder:portrait)` | a generated, theme-tinted placeholder |
| `![Star](icon:star)` | an inline icon from the theme's icon set |
| `![Photo](/images/real.png)` | an ordinary `<img>` (unchanged) |

Anything that isn't a recognised scheme — a relative path, an absolute URL, a
`data:` URI — falls through to the normal `<img>` path untouched. Because the
schemes resolve to an `<svg>` *element* (not an image URL), they're scalable,
theme-aware, and need no network request.

## `placeholder:<shape>` — generated placeholders

A stand-in image for drafts, fixtures, and templates: deterministic, offline,
and self-contained. Pick the **shape** that matches the slot's aspect.

{% preview source=true %}

{% gallery %}
![A wide cover](placeholder:cover)
![A square tile](placeholder:square)
![A tall portrait](placeholder:portrait)
{% /gallery %}

{% /preview %}

The placeholder is a neutral scene drawn with theme tokens
(`--rf-color-surface` / `--rf-color-muted` / `--rf-color-border`), so it picks
up the active tint and dark mode automatically. Output is deterministic — the
same shape always renders identically, so it's safe for screenshot tests.

### Shapes

| Shape | Aspect | Use |
|-------|--------|-----|
| `cover` | 16:9 | hero / banner / gallery tiles |
| `wide` | 12:5 | wide banners |
| `banner` | 3:1 | thin page banners |
| `square` | 1:1 | even tiles, equal-ratio media |
| `portrait` | 3:4 | vertical cards, posters |
| `thumbnail` | 4:3 | small previews |
| `avatar` | round | profile / author images |

An unknown shape falls back to `cover`.

Drafting with placeholders lets you lay out an image-heavy page before the real
assets exist, then swap each `placeholder:<shape>` for a real path later.

## `icon:<name>` — inline icons

The inline shorthand for the [`{% icon %}`](/runes/icon) rune: resolve an icon
by name (e.g. `icon:star`, `icon:mail`) from the theme's icon set, right inside
prose.

{% preview source=true %}

Give a project a ![star](icon:star) star, or reach us by ![email](icon:mail) email.

{% /preview %}

`icon:<name>` draws from exactly the same icon registry as the `{% icon %}`
rune, including `group/name` syntax (e.g. `icon:hint/warning`). Reach for the
rune when you want a size override or a standalone icon; reach for `icon:` when
an icon reads most naturally as an inline image in a sentence. An unknown name
falls back to a neutral glyph.

## Accessibility

The image **`alt`** becomes the accessible label:

- `![GitHub](icon:github)` → the icon is exposed to assistive tech labelled
  "GitHub" (`role="img"`, `aria-label="GitHub"`).
- `![](placeholder:cover)` with **empty** `alt` is treated as decorative
  (`aria-hidden`), so screen readers skip it — the right default for a
  stand-in image.

Write `alt` the same way you would for any image: describe what it conveys, or
leave it empty when it's purely decorative.

## A note on `data:image/svg+xml`

Raw inline SVG data-URIs — `![](data:image/svg+xml,…)` — are **silently
dropped**. The Markdown parser's link sanitiser allows `data:image/png` (and
gif/jpeg/webp) but rejects `data:image/svg+xml` as an XSS-hardening measure, so
the image never parses. Use `placeholder:` or `icon:` (which emit a trusted
inline `<svg>` element, sidestepping the restriction), or a non-SVG image.

## See also

- [Icon](/runes/icon) — the `{% icon %}` rune and the theme icon registry.
- [Figure](/runes/figure) · [Media guests](/runes/media-guests) — where images land.
