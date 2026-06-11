---
title: Section
description: A generic page section — an eyebrow, headline, and blurb above any content
category: Layout
plugin: core
status: stable
type: rune
---

# Section

A generic page section: a short **header** — eyebrow, headline, blurb (and an optional image) — above an **arbitrary body**. Use it to introduce any content block with a title and intro, especially primitives that have no header of their own like [`bento`](/runes/marketing/bento), a grid of [cards](/runes/card), or a [collection](/runes/collection).

It reads the same header slots as [`feature`](/runes/marketing/feature), [`hero`](/runes/marketing/hero), and [`reveal`](/runes/reveal) — no extra tags. The first paragraph is the eyebrow, the first heading the headline, the next paragraph the blurb; everything after is the body.

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

Every header slot is optional. With no leading eyebrow/headline/blurb the section is just a styled wrapper around its body; with only a header it's a standalone intro.

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

| Attribute | Type | Description |
|-----------|------|-------------|
| `align` | `start` \| `center` \| `end` | Header alignment (default `start`). The body always spans the full section width. |

## Anatomy

| Slot | From | Class |
|------|------|-------|
| Eyebrow | first paragraph | `.rf-section__eyebrow` |
| Headline | first heading | `.rf-section__headline` |
| Blurb | first paragraph after the headline | `.rf-section__blurb` |
| Image | first image | `.rf-section__image` |
| Body | everything else | `.rf-section__body` |

The header slots are wrapped in `.rf-section__preamble`; the whole block is `.rf-section`.
