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

## Align the header

`align` positions the header (the body always spans the section). Use `center` for marquee sections, `end` to right-align.

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

The header slots are wrapped in `.rf-section__preamble`; the whole block is `.rf-section`.
