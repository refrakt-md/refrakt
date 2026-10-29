---
title: Section
description: A generic page section — an eyebrow, headline, and blurb above any content
category: Layout
plugin: core
status: stable
type: rune
---

# Section

A generic page section: a short **header** — eyebrow, headline, blurb — above an **arbitrary body**. Use it to introduce any content block with a title and intro, especially primitives that have no header of their own like [`bento`](/runes/marketing/bento), a grid of [cards](/runes/card), or a [collection](/runes/collection).

The header is anchored to the headline, written as a heading at the start of the section. A paragraph directly before it is the eyebrow, and a paragraph directly after it is the blurb. Everything else is the body. A section that does not start with a heading, or with one paragraph and then a heading, has no header: all of its content is body, so prose placed in a section is never re-read as an eyebrow.

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

## Header-only or body-only

Every header slot is optional. With no leading heading the section is just a styled wrapper around its body; with only a header it's a standalone intro.

## Choose which header roles to read

`header` says how much of the start of the section becomes its header:

| Value | Reads |
|---|---|
| `auto` (default) | eyebrow, headline and blurb, around a leading heading |
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

| Attribute | Values | What it does |
|---|---|---|
| `media-position` | `top`, `bottom`, `start`, `end`, `cover` | Where the media zone sits. Turns zoning on. |
| `media-ratio` | `1/3` … `2/3` | The media's share of the row, beside the content |
| `valign` | `top`, `center`, `bottom`, `stretch` | Cross-axis alignment, beside the content |
| `collapse` | `sm`, `md`, `lg`, `never` | When a side-by-side split stacks |
| `media` | `portrait`, `cover`, `thumbnail`, `hero`, `icon` | What the media zone holds, so the media dimension styles it. `portrait` is cropped round. |
| `guest-fit` | `clip` (default), `bleed` | Whether the media guest is cropped to its zone or may spill past it |

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

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:section"} /%}

## Anatomy

| Slot | From | Class |
|------|------|-------|
| Eyebrow | a paragraph directly before the headline | `.rf-section__eyebrow` |
| Headline | a heading at the start, or after the eyebrow | `.rf-section__headline` |
| Blurb | a paragraph directly after the headline | `.rf-section__blurb` |
| Body | everything else | `.rf-section__body` |
| Media | the leading zone, with `media-position` | `.rf-section__media` |
| Content | the header, body and footer, with `media-position` | `.rf-section__content` |
| Footer | a trailing zone after a second `---`, with `media-position` | `.rf-section__footer` |

The header slots are wrapped in `.rf-section__preamble`; the whole block is `.rf-section`.
