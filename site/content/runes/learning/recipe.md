---
title: Recipe
description: Structured recipe with ingredients, steps, and chef tips
category: Learning
plugin: learning
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:recipe"} /%}

Structured recipe content. Unordered lists become ingredients, ordered lists become steps, and blockquotes become chef's tips.

## Basic usage

A complete recipe with ingredients, instructions, and a tip.

{% preview source=true %}

	{% recipe prepTime="PT15M" cookTime="PT30M" servings=4 difficulty="easy" %}
	# Classic Pasta Carbonara

	A rich and creamy Italian pasta dish.

	- 400g spaghetti
	- 200g pancetta
	- 4 egg yolks
	- 100g Pecorino Romano
	- Black pepper to taste

	1. Cook pasta in salted boiling water until al dente
	2. Fry pancetta in a large pan until crispy
	3. Whisk egg yolks with grated cheese and pepper
	4. Toss hot pasta with pancetta, then stir in egg mixture off the heat

	> The residual heat from the pasta cooks the eggs — never add eggs directly to a hot pan or they will scramble.
	{% /recipe %}

{% /preview %}

## Section header

Recipe supports an optional eyebrow, headline, and blurb above the section above ingredients and method. Place a short paragraph before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

## Place the media

The body splits on `---` into **media → content → footer** zones (media-first in source). `media-position` controls visual placement independently of source order.

`media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Cover mode

`media-position="cover"` turns the recipe into a poster: the title block (eyebrow, headline, blurb) overlays the media as a header, and the ingredients, steps, and tips flow below on the page palette. Recipe uses **header scope** — only the preamble sits on the image, never the long body — so it's the same one-attribute switch as on `card`, scoped to the part that belongs on the photo.

{% preview source=true %}

	{% recipe prepTime="PT5M" servings=1 difficulty="easy" media-position="cover" scrim-type="frost" scrim-blur="md" %}
	![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

	---

	A cocktail classic

	## Tequila Sunrise

	A layered showstopper that transitions from deep orange to golden yellow — like watching the sun come up in a glass.

	- 60ml tequila
	- 120ml fresh orange juice
	- 15ml grenadine
	- Orange slice and cherry for garnish

	1. Fill a tall glass with ice and pour in the tequila and orange juice. Stir gently.
	2. Slowly pour grenadine over the back of a spoon so it sinks to the bottom.
	3. Let the layers settle, then garnish with an orange slice and a cherry.
	{% /recipe %}

{% /preview %}

The cover scrim, `content-place` anchor, and `scrim-type="frost"` work exactly as on [`card`](/runes/card#cover-mode) — here the frosted band reads behind the title while the metadata and method below stay on the normal surface. Only the overlaid header flips to a light foreground; the body keeps the page palette.

## Card vs hero

A recipe is a bordered card by default. The same recipe becomes a full-bleed hero by composing the three surface axes — `elevation="flush"` drops the card chrome, `width="full"` takes it edge-to-edge, and `prominence="display"` scales the title up — with no rune fork:

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

This differs from [cover mode](#cover-mode) above: cover overlays the title *on* the image (a poster), while the hero stacks a display-size title above an edge-to-edge image. Both are one-line switches on the same content. See [Surfaces → Card vs hero](/runes/surfaces#card-vs-hero) for the full axis reference.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:recipe"} /%}
