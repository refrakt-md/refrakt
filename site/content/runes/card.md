---
title: Card
description: A generic, self-contained content card — optional media, body, and footer zones, with an optional whole-card link
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:card"} /%}

A self-contained tile: a bordered surface with an optional media zone, a body, and an optional footer. Use it on its own in prose, or as the body template of a [collection](/runes/collection) to list entities; there is one `card` for every kind of item, rather than a card rune per type. To give a block of content a headline and intro without framing it as a tile, use [section](/runes/section).

## Basic usage

{% preview source=true %}

	{% card %}
	---
	### Valley loop
	Nine kilometres along the river and back over the ridge, with a café at the halfway bridge.

	---

	Walk · Moderate · 3 hours
	{% /card %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| Content with no `---` | The body |
| One `---` | Splits the content into the media zone (before) and the body (after) |
| Two `---` | Media, body and footer; leave the first zone empty for a footer without media |
| A paragraph directly followed by a heading, at the start of the body | The eyebrow above the title |
| The first heading in the body | The card's title, which also names a linked card for screen readers |

## Add media and a footer

Put an image before the first `---`, the body after it, and a short meta line after a second `---`. Here `Brunch classic` becomes the eyebrow over the title.

{% preview source=true %}

	{% card href="/runes/learning/recipe" media-position="start" %}
	![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

	---

	Brunch classic

	### Tequila Sunrise
	A bright, layered cocktail — five minutes, no shaker.

	---

	Cocktail · Easy
	{% /card %}

{% /preview %}

The media zone takes any block, not only an image: a `codegroup`, a `chart`, a `map` or a running `sandbox` fit the same way. [Media guests](/docs/concepts/media-guests) shows each one in a card.

## Place the media

The media always comes first in the source; `media-position` decides where it shows:

- `top` or `bottom` stacks it above or below the body.
- `start` or `end` puts it beside the body on wide screens, and above it once the card is narrow.
- `cover` lays the body over the media (see [Cover mode](#cover-mode)).

When the media sits beside the body, `media-ratio` sets its share of the width (`1/3` to `2/3`), `valign` aligns the two columns, and `collapse` picks the container width at which they stack (`sm`, `md`, `lg`, or `never`). Every rune with a media zone takes these same attributes.

## Link the whole card

`href` makes the entire card one link. Links inside the body or footer stay clickable, and screen readers announce the link by the card's title.

```markdoc
{% card href="/guide/getting-started/" %}
### Getting started
Read the five-minute guide.
{% /card %}
```

Because a linked card is a single click target, an interactive media guest such as a `codegroup` or a live `map` shows its static form and passes clicks through to the link, and the build warns. Drop `href` if the guest needs to stay interactive. To make any other block a link, wrap it in [link](/runes/link).

## Lift the card and frame its media

`elevation` sets how far the card stands off the page, from `sunken` to `overlay`. The `frame-*` attributes shape the media zone: `frame-aspect` gives it a fixed shape and `frame-anchor` picks the focal point of the crop.

{% preview source=true %}

	{% card elevation="raised" frame-aspect="16/9" frame-anchor="top left" %}
	![Moss-covered trunks in an old-growth forest](https://assets.refrakt.md/media-text-old-growth.jpg)
	---
	### Old-growth trail
	A shaded two-hour walk among trees that predate the town.
	{% /card %}

{% /preview %}

[Surfaces](/docs/concepts/surfaces) lists every elevation step and frame facet, including displacement and silhouette shadows.

## Cover mode

`media-position="cover"` turns the card into a poster: the media fills the card and the body sits over it.

{% preview source=true %}

	{% card href="/runes/learning/recipe" media-position="cover" scrim-type="frost" scrim-blur="md" height="lg" %}
	![A tequila sunrise cocktail](https://assets.refrakt.md/tequila-sunrise.png)

	---

	Brunch classic

	### Tequila Sunrise
	A bright, layered cocktail — five minutes, no shaker.
	{% /card %}

{% /preview %}

- **Shape.** A cover card has no natural height, so give it `height` (`sm` to `xl`) or `aspect` (such as `3/4`). Inside a bento cell or a collection row, the grid track sets the size instead. A card with only a [background](/runes/bg) and no media needs `height` or `aspect` too.
- **Where the text sits.** `content-place` takes a block and an inline position, each `start`, `center` or `end`: `content-place="center center"` centers the text. The default places it along the bottom of a portrait card and the start of a landscape one. It applies only in cover mode.
- **Legibility.** A cover card darkens the media behind the text with a gradient [scrim](/runes/bg#scrim), and the text turns light to match. `scrim` picks the edge it darkens from, `scrim-type="frost"` blurs instead (as above, with `scrim-blur` setting how much), and `scrim="none"` turns it off.

## Feed cards from a collection

In a `collection` body template, `$item` fills the card from each entity's fields:

```markdoc
{% collection type="page" filter="url:/blog/*" sort="date-desc" layout="grid" %}
	{% card href=$item.url %}
	### {% $item.data.title %}
	{% date($item.data.date) %} — {% $item.data.description %}
	{% /card %}
{% /collection %}
```

In a grid, cards in a row share the tallest card's height, so their footers line up. See [collection → per-item templates](/runes/collection#per-item-templates) for what `$item` holds.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:card"} /%}

## See also

- [collection](/runes/collection) — feeds cards from registry entities through a body template.
- [Surfaces](/docs/concepts/surfaces) and [Media guests](/docs/concepts/media-guests) — the shared vocabulary for frames, cover layouts and what the media zone can hold.
