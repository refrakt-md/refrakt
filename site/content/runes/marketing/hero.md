---
title: Hero
description: Full-width intro sections for landing pages with background support and action buttons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:hero"} /%}

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

## Start-aligned

Use `align="start"` for a more editorial feel. `align` takes `start`, `center` (the default) or `end`. The older `left`, `right` and `justify` are no longer accepted; `refrakt migrate hero <paths> --apply` rewrites them.

{% preview source=true %}

	{% hero align="start" %}
	# Documentation that writes itself

	Semantic runes transform your Markdown into structured, accessible content.

	- [Quick start](/docs/getting-started)
	{% /hero %}

{% /preview %}

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

The sandbox becomes a backdrop: it takes no clicks or focus, and fills the band without any setting of its own. A few things keep it working well:

- **Load it eagerly.** `activation="visible"` or `"click"` would put a Run control under the content, out of reach; the build warns.
- **Keep it dim.** The scene sits under the scrim, so darker than looks right on its own is right.
- **Respect reduced motion.** Show a still frame when the reader asks for less motion, as the waves scene does.
- **Keep it light.** It loads with the page. Cap the pixel ratio, pause when the tab is hidden, and show a still fallback where WebGL is missing; the [three.js scene in Media guests](/runes/media-guests#live-program) does all three.

`scrim` picks the edge the scrim darkens from, or `none` for no scrim, and `scrim-type="frost"` blurs the media instead (`scrim-blur` sets how much).

### Backdrop *and* a subject — a live `bg` behind positioned media

Cover (above) turns the **single media zone** into the backdrop, so the hero can't *also* carry a positioned subject. When you want both — an animated backdrop **and** a framed code sample or screenshot — put the live scene in the [`bg`](/runes/bg) layer instead, leaving the media zone free for the subject. The `bg` body takes one bare [sandbox](/runes/sandbox): it renders full-bleed *behind* the content (out of flow, inert), while the media guest stays in flow, framed and placed by `media-position`. The visualiser is the **ambiance**; the code sample is the **subject** — they stop competing for one slot.

{% preview source=true %}

	{% hero media-position="end" tint-mode="dark" collapse="lg" %}
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

Hero supports an optional eyebrow, headline, and blurb above the headline and description. Place a short paragraph before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

## Place the media

The body splits on `---` into **media → content** zones (media-first in source). `media-position` controls visual placement independently of source order — a landing-page hero typically uses `media-position="end"` to put the screenshot on the right. `media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:hero"} /%}
