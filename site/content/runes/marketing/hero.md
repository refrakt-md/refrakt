---
title: Hero
description: Full-width intro sections for landing pages with background support and action buttons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/marketing**. Install with `npm install @refrakt-md/marketing` and add `"@refrakt-md/marketing"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Hero

Full-width intro section for the top of a page. Headings and paragraphs become the header, links become action buttons, and code fences become copyable command blocks. The first link is styled as a primary button. For smaller, focused action blocks that can appear anywhere, use [CTA](/runes/marketing/cta) instead.

## Basic usage

A centered hero section with headline, description, and action buttons.

{% preview source=true %}

{% hero %}

Whats new [Version 1.0](#)

# Build with refrakt.md

A content framework that turns Markdown into rich, semantic pages. Write standard Markdown — runes decide how it's interpreted.

- [Get started](/docs/getting-started)
- [View on GitHub](https://github.com/refrakt-md/refrakt)
{% /hero %}

{% /preview %}

## With command block

Code fences inside a hero become copyable command blocks — great for install commands on landing pages.

{% preview source=true %}

{% hero %}
# Get started in seconds

Scaffold a project and start writing.

```shell
npm create refrakt
```

- [Documentation](/docs/getting-started)
{% /hero %}

{% /preview %}

## Left-aligned

Use `align="left"` for a more editorial feel.

{% preview source=true %}

{% hero align="left" %}
# Documentation that writes itself

Semantic runes transform your Markdown into structured, accessible content.

- [Quick start](/docs/getting-started)
{% /hero %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `align` | `string` | `center` | Horizontal alignment of headline + body text: `left`, `center`, `right` |

## Cover — content over a full-bleed backdrop

`media-position="cover"` turns the media zone into a full-bleed backdrop: the media fills the section interior and the headline, blurb, and actions overlay it. A legibility scrim and a light-on-dark foreground are applied automatically — it's a one-attribute switch on the same content.

{% preview source=true %}

{% hero media-position="cover" %}
![Mountain valley at dusk](https://assets.refrakt.md/media-text-valley.jpg)

---

# Documentation that reads like it was designed

Semantic runes turn plain Markdown into structured pages.

- [Get started](/docs/getting-started)
- [Explore the runes](/runes/rune-catalog)
{% /hero %}

{% /preview %}

The band's height comes from `height` (named scale) or `aspect` (a ratio); with neither, a wide default aspect with a viewport floor applies. `content-place` anchors the overlay — by default the content sits as a centred band.

### Animated background — a live program as the backdrop

The media zone holds *any* [media guest](/runes/media-guests) — including a running [sandbox](/runes/sandbox). Drop a three.js scene in the media zone and the hero gets an **animated background**: the sandbox becomes an inert presentational backdrop (no pointer events, no focus stops), the content overlays it, and the scrim keeps the text legible. Here a wireframe terrain rolls in slow swells, its crests picking up the site's own [niwaki](/themes/niwaki) accent colours:

{% preview source=true %}

{% hero media-position="cover" height="lg" %}
{% sandbox src="wireframe-waves" /%}

---

# Markdown in, meaning out

Plain text becomes structured, semantic pages.

- [See how it works](/docs/getting-started)
{% /hero %}

{% /preview %}

**The mechanism:** the cover layout stacks the content over the media well; the [interaction-posture contract](/extend/rune-authoring/composability#media-guest-interaction-posture) demotes any cover guest to `presentational`; and the sandbox automatically switches to `height="fill"` so the iframe fills the band. No sandbox-side configuration is needed.

**The authoring contract for an animated backdrop:**

- **Eager only.** `activation="visible"` or `"click"` contradicts an inert backdrop — the Run control would be unreachable — and produces a build warning. The cost lands on first paint, so keep the scene lean.
- **Design dim.** The scene sits *under* the scrim; darker than feels right in isolation is right.
- **Respect motion.** Render a single static frame under `prefers-reduced-motion` (the waves scene does).
- **Cap the budget.** Pin the dependency version, cap `devicePixelRatio`, pause the animation loop when the tab is hidden, and put a CSS gradient behind the canvas so the boot frame looks designed. Ship a static fallback for no-WebGL / blocked-CDN visitors.
- **Pin the canvas to the viewport.** Size it with `position: fixed; inset: 0` rather than a `height: 100%` chain — sandbox content renders inside a plain wrapper element with auto height, which breaks percentage heights and leaves the canvas as a fixed-size strip.

### Cover attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `content-place` | `string` | `auto` | Overlay anchor: `"<block> <inline>"` (e.g. `"end start"`), or `auto` — a centred band |
| `height` | `string` | — | Band height (named scale): `sm`, `md`, `lg`, `xl` |
| `aspect` | `string` | — | Band aspect ratio (e.g. `"21/9"`); without `height`/`aspect`, a wide default with a viewport floor applies |
| `scrim` | `string` | on | Scrim edge (`top`, `bottom`, `left`, `right`) or `none` to opt out |
| `scrim-type` | `string` | `gradient` | Scrim treatment: `gradient` or `frost` (with `scrim-blur`: `none`, `sm`, `md`, `lg`) |

### Backdrop *and* a subject — a live `bg` behind positioned media

Cover (above) turns the **single media zone** into the backdrop, so the hero can't *also* carry a positioned subject. When you want both — an animated backdrop **and** a framed code sample or screenshot — put the live scene in the [`bg`](/runes/bg) layer instead, leaving the media zone free for the subject. The `bg` body takes one bare [sandbox](/runes/sandbox): it renders full-bleed *behind* the content (out of flow, inert), while the media guest stays in flow, framed and placed by `media-position`. The visualiser is the **ambiance**; the code sample is the **subject** — they stop competing for one slot.

{% preview source=true %}

{% hero media-position="end" tint-mode="dark" collapse="md" %}
{% bg overlay="dark" overlay-opacity="0.4" %}
{% sandbox src="wireframe-waves" /%}
{% /bg %}
{% codegroup %}
```shell
npm create refrakt@latest
```
```js
import { defineConfig } from '@refrakt-md/sveltekit';

export default defineConfig({
  plugins: ['@refrakt-md/marketing'],
});
```
{% /codegroup %}

---

# Backdrop and subject, at once

The wireframe terrain is a `bg` sandbox; the install snippet is the positioned media guest. One surface, two media intents.

- [How surfaces compose](/runes/surfaces)
{% /hero %}

{% /preview %}

The backdrop sandbox is forced to `height="fill"` and the **backdrop posture** — mounted and running, but pointer-inert, not mounted under `prefers-reduced-motion` (the [boot frame](/runes/bg) stands in), and suspended off-screen. The still subject media remains the crawlable / share representation. See [`bg`](/runes/bg) and [media guests](/runes/media-guests) for the full model.

## Section header

Hero supports an optional eyebrow, headline, and blurb above the headline and description. Place a short paragraph or heading before the main content to use them. See [Page sections](/extend/rune-authoring/page-sections) for the full syntax.

### Layout attributes

The body splits on `---` into **media → content** zones (media-first in source). `media-position` controls visual placement independently of source order — a landing-page hero typically uses `media-position="end"` to put the screenshot on the right.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `media-position` | `string` | `bottom` | Where the media sits: `top`, `bottom` (the default — media beneath the text, the classic hero), `start` (left), `end` (right), or `cover` (full-bleed backdrop — see [Cover](#cover--content-over-a-full-bleed-backdrop)) |
| `media-ratio` | `string` | — | Media's share of the row when beside content (`start`/`end`): `1/3`, `2/5`, `1/2`, `3/5`, `2/3` |
| `valign` | `string` | — | Cross-axis alignment when media is beside content: `top`, `center`, `bottom`, `stretch` |
| `collapse` | `string` | — | Breakpoint at which beside layouts collapse to a stack: `sm`, `md`, `lg`, `never` |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
