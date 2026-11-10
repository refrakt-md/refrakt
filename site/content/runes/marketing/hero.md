---
title: Hero
description: Full-width intro sections for landing pages with background support and action buttons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:hero"} /%}

A full-width opening band for the top of a page: a headline, a short pitch, and the buttons or install command that start the reader off. For a smaller action block that can appear anywhere, use [cta](/runes/marketing/cta).

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

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |
| More headings and paragraphs | Further copy under the blurb |
| A list of links | A row of buttons; the first link is the primary action |
| A code fence | A copyable command line beside the buttons |
| An image or other media, then `---`, before the rest | The hero's media ([Place the media](#place-the-media)) |

## Add an install command

A code fence in a hero becomes a copyable command line beside the buttons.

{% preview source=true %}

	{% hero %}
	# Get started in seconds

	Scaffold a project and start writing.

	```shell
	npx create-refrakt
	```

	- [Documentation](/docs/getting-started)
	{% /hero %}

{% /preview %}

## Align the text to the start

`align="start"` gives the hero a more editorial feel. `align` takes `start`, `center` (the default) or `end`.

{% preview source=true %}

	{% hero align="start" %}
	# Documentation that writes itself

	Semantic runes transform your Markdown into structured, accessible content.

	- [Quick start](/docs/getting-started)
	{% /hero %}

{% /preview %}

## Place the media

Put an image or other media first, then `---`, then the hero's copy. `media-position="end"` puts the media on the right, the usual place for a product screenshot; `start` puts it on the left, and `top` or `bottom` stack it. `media-ratio`, `valign` and `collapse` tune the side-by-side split, as on [card](/runes/card#place-the-media).

## Put the text over a backdrop

`media-position="cover"` makes the media a full-bleed backdrop, with the headline, blurb and buttons over it. The media is darkened behind the text so it stays readable.

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

Set the band's height with `height` (`sm` to `xl`) or `aspect`; without either it takes a wide default. `content-place` moves the text, and `scrim`, `scrim-type="frost"` and `scrim-blur` change how the backdrop is darkened, as in a [cover card](/runes/card#cover-mode).

### Animate the backdrop

The backdrop can be a running [sandbox](/runes/sandbox) instead of an image. Here a three.js wireframe terrain rolls in slow swells behind the text, in the site's own [niwaki](/themes/niwaki) accent colors:

{% preview source=true %}

	{% hero media-position="cover" height="lg" %}
		{% sandbox src="wireframe-waves" /%}

		---

		# Markdown in, meaning out

		Plain text becomes structured, semantic pages.

		- [See how it works](/docs/getting-started)
	{% /hero %}

{% /preview %}

The sandbox fills the band and takes no clicks or focus. To keep it working well:

- **Load it eagerly.** `activation="visible"` or `"click"` would put a Run control under the text, out of reach; the build warns.
- **Keep it dim.** The scene sits under the scrim, so darker than looks right on its own is right.
- **Respect reduced motion.** Show a still frame when the reader asks for less motion, as the waves scene does.
- **Keep it light.** It loads with the page. Cap the pixel ratio, pause when the tab is hidden, and show a still fallback where WebGL is missing; the [three.js scene in Media guests](/docs/concepts/media-guests#live-program) does all three.

### Animate the background and keep the media

Cover mode uses the media zone for the backdrop. To have an animated backdrop and a screenshot or code sample beside the text, put the sandbox in a [bg](/runes/bg) instead, and leave the media zone for the subject:

{% preview source=true %}

	{% hero media-position="end" tint-mode="dark" collapse="lg" %}
		{% bg overlay="dark" overlay-opacity="0.4" %}
			{% sandbox src="wireframe-waves" /%}
		{% /bg %}
		{% codegroup %}
		```shell
		npx create-refrakt
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

		- [How surfaces compose](/docs/concepts/surfaces)
	{% /hero %}

{% /preview %}

The background scene fills the hero behind everything and takes no clicks. It stays still for readers who ask for reduced motion and pauses when scrolled out of view, while the media beside the text is what search engines and link previews use.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:hero"} /%}
