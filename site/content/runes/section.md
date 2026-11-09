---
title: Section
description: A generic page section — an eyebrow, headline, and blurb above any content
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:section"} /%}

Use it to introduce any content block with a title and intro, especially primitives that have no header of their own like [`bento`](/runes/marketing/bento), a grid of [cards](/runes/card), or a [collection](/runes/collection). To frame content as a bordered tile, one of a grid or list of items, use [card](/runes/card).

## Basic usage

{% preview source=true %}

	{% section %}
		Composability

		## Runes that work together

		Every block is a rune — combine them freely to build a page.

		{% bento %}
		## Marketing
		Hero, CTA, pricing, testimonials.

		## Docs
		API references, changelogs, symbols.

		## Storytelling
		Characters, realms, factions, lore.
		{% /bento %}
	{% /section %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading at the start of the section | The headline |
| A paragraph directly before that heading | The eyebrow |
| A paragraph directly after it | The blurb |
| A blockquote after the headline and blurb, then `**Name** — Source` | The epigraph ([An epigraph](#an-epigraph)) |
| Everything else | The body |
| Content that does not start with a heading, or with one paragraph and then a heading | All body: the section has no header, so prose is never re-read as an eyebrow |
| `---`, when `media-position` is set | Splits the media, the content and a footer ([Media beside or above the content](#media-beside-or-above-the-content)) |

## Header-only or body-only

Every header slot is optional. With no leading heading the section is just a styled wrapper around its body; with only a header it's a standalone intro.

## An epigraph

A blockquote after the headline and blurb, followed by an attribution, `**Name** — Source`, is the section's **epigraph**: a short quotation that opens it. It is part of the header and renders as a `<figure data-quote="epigraph">` with its source as the `<figcaption>`.

{% preview source=true %}

	{% section %}
	## Wandering

	Notes on the long way round.

	> Not all those who wander are lost.

	**J. R. R. Tolkien** — The Fellowship of the Ring

	The body begins here.
	{% /section %}

{% /preview %}

The attribution can also be the quote's own last line, `> — **Name**, Source`. The quote and the attribution are read together. Without an attribution the blockquote stays an ordinary quotation in the body, and an attribution on its own after the headline stays the blurb. Every rune composed over `section` reads epigraphs the same way; set `header="headline"` to read none.

The same holds at the start of a page: a blockquote that opens a page's content, or directly follows its `#` title, with an attribution after it, is the page's epigraph.

## Choose which header roles to read

`header` says how much of the start of the section becomes its header:

| Value | Reads |
|---|---|
| `auto` (default) | eyebrow, headline, blurb and epigraph, around a leading heading |
| `headline` | only a leading heading; the paragraph after it stays body |
| `none` | no header; all content is body |

{% preview source=true %}

	{% section header="headline" %}
	## Release notes

	This paragraph is body text, not a blurb.
	{% /section %}

{% /preview %}

A [composed rune](/extend/rune-authoring/composed-runes) that places a `section` gets the same grammar for its slots. When a slot's content lands in a header role the slot is not named for, the build reports `slot-header-role` and names both remedies: name the field for the role, or set `header` on the section.

## Media beside or above the content

Give a section `media-position` and it splits on `---` the way [`card`](/runes/card) does: a leading media zone, the content, and an optional trailing footer. The header stays in the content column, beside or below the media. Without `media-position` the section reads no zones, and a `---` is an ordinary rule in the body.

{% preview source=true %}

	{% section media-position="start" media-ratio="1/3" %}
	![A harbour at dawn](placeholder:landscape)

	---

	Field notes

	## The harbour at dawn

	Salt, rope and the first boats going out.

	The tide turns an hour after sunrise, and the market opens with it.
	{% /section %}

{% /preview %}

`media-position` places the media and turns the zones on. Beside the content, `media-ratio` sets the media's share of the row, `valign` aligns the two and `collapse` picks the width at which they stack. `media` says what the zone holds, so it is styled to match: `portrait` is cropped round.

The zones count as `card`'s do: one zone is the content, two are media and content, and three or more add the last as the footer. An empty leading zone means no media, and the media element is left out.

`guest-fit="bleed"` lets the media guest spill past its zone, as a hero image does, where the default `clip` crops it to the zone. It is stamped as `data-guest-fit` on the media zone. A displaced guest (`frame-displace`) then defaults to bleeding too, and `frame-overflow="bleed"` only has an effect on a bleed section.

### Cover

`media-position="cover"` lays the content over the media, as on `card`. A section is a page band rather than a card, so its height comes from its content, with a minimum of about half the viewport, never from the media's shape. `height` (`sm` to `xl`) sets a taller minimum and `aspect` a fixed ratio. With no `content-place` the content sits mid-band over an evenly darkened scrim, and `content-place` anchors it elsewhere (`"end start"`). A flush cover section's media runs edge to edge, with no radius.

## Align the header

`align` positions the header and the section's own row of [`actions`](/runes/actions) (the body always spans the section). Use `center` for marquee sections, `end` to right-align.

{% preview source=true %}

	{% section align="center" %}
		Pick a plan

		## Simple, transparent pricing

		No hidden fees. Cancel anytime.

		{% bento %}
		## Free
		For trying things out.

		## Pro
		For growing teams.
		{% /bento %}
	{% /section %}

{% /preview %}

## Anatomy

| Slot | From | Class |
|------|------|-------|
| Eyebrow | a paragraph directly before the headline | `.rf-section__eyebrow` |
| Headline | a heading at the start, or after the eyebrow | `.rf-section__headline` |
| Blurb | a paragraph directly after the headline | `.rf-section__blurb` |
| Epigraph | an attributed blockquote after the headline and blurb | `.rf-section__epigraph` |
| Body | everything else | `.rf-section__body` |
| Media | the leading zone, with `media-position` | `.rf-section__media` |
| Content | the header, body and footer, with `media-position` | `.rf-section__content` |
| Footer | a trailing zone after a second `---`, with `media-position` | `.rf-section__footer` |

The header slots are wrapped in `.rf-section__preamble`; the whole block is `.rf-section`.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:section"} /%}
