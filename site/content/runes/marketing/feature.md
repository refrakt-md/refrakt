---
title: Feature
description: Feature showcases with name, description, and optional icons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:feature"} /%}

A set of features or benefits, each with a name and a short description, optionally beside an image or code sample.

## Basic usage

An eyebrow, a headline and a short blurb introduce a grid of named features.

{% preview source=true responsive="mobile,tablet,desktop" %}

	{% feature %}
	what you get

	## Structured data

	Refrakt gives you the building blocks to ship structured content sites without fighting your framework.

	- **Semantic runes**

	  Markdown primitives take on different meaning depending on the wrapping rune. Write Markdown — the rune decides what it means.

	- **Type-safe output**

	  Every rune produces typed, validated content that your theme components can rely on.

	- **Layout inheritance**

	  Define regions once in a parent layout. Child pages inherit and can override with prepend, append, or replace modes.
	{% /feature %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph, before the list | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |
| A list item | A feature |
| Bold text in the item's first paragraph | The feature's name |
| An image or icon beside the name | The feature's icon |
| The paragraph after the name | The feature's description |
| Media, then `---`, before the rest | A media column beside or above the features ([Place the media](#place-the-media)) |

## Place the media

Put an image, a code sample or other media first, then `---`, then the features. `media-position="end"` puts the media on the right and the features in a single column beside it; `start` puts it on the left, and `top` or `bottom` stack it with the features in a grid. `media-ratio`, `valign` and `collapse` tune the side-by-side split, as on [card](/runes/card#place-the-media); `collapse` also sets the width at which a grid of features drops to one column.

{% preview source=true responsive="mobile,tablet,desktop" %}

	{% feature media-position="end" %}
		{% codegroup %}
		```yaml title="refrakt.config.ts"
		export default {
		  content: './content',
		  theme: '@refrakt-md/lumina'
		}
		```

		```md title="content/index.md"
		---
		title: Home
		---

		{% hero %}
		# Welcome
		{% /hero %}
		```
		{% /codegroup %}

		---

		why Refrakt

		## Built for versatility

		- **Zero config**

		  Drop Markdown files into your content directory. Routing, layouts, and type generation happen automatically.

		- **Framework agnostic**

		  Render your pages with Svelte, React, Vue or plain HTML.
	{% /feature %}

{% /preview %}

## Arrange the features

`layout` sets how the features are laid out, whatever the media does: `grid` tiles them, `list` stacks them in one column, and `carousel` puts them on a horizontal track that scrolls with previous and next buttons. Without `layout`, a feature with media beside it uses `list` and any other uses `grid`.

{% preview source=true responsive="mobile,tablet,desktop" %}

	{% feature layout="carousel" %}

	why Refrakt

	## Built for versatility

	- **Zero config**

	  Drop Markdown files into your content directory.

	- **Framework agnostic**

	  Render with Svelte, React, Vue or plain HTML.

	- **Type-safe output**

	  Every rune produces validated content.

	- **Incremental adoption**

	  Add runes to existing Markdown one block at a time.
	{% /feature %}

{% /preview %}

### Switch to a carousel on small screens

`collapse-to="carousel"` keeps a grid on wide screens and turns it into a swipeable row once the feature is narrow, instead of stacking it. The switch follows the feature's own width, so it also happens in a narrow column. Set the preview to `mobile` to see it:

{% preview source=true responsive="mobile,tablet,desktop" %}

	{% feature layout="grid" collapse-to="carousel" %}

	why Refrakt

	## Built for versatility

	- **Zero config**

	  Drop Markdown files into your content directory.

	- **Framework agnostic**

	  Render with Svelte, React, Vue or plain HTML.

	- **Type-safe output**

	  Every rune produces validated content.

	- **Incremental adoption**

	  Add runes to existing Markdown one block at a time.
	{% /feature %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:feature"} /%}
