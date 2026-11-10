---
title: Steps
description: Step-by-step instructions with numbered indicators
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:steps"} /%}

Numbered instructions a reader follows in order: installing, onboarding, a process. For dated events, use [timeline](/runes/business/timeline); for a product's releases, [changelog](/runes/docs/changelog).

## Basic usage

{% preview source=true %}

	{% steps %}
	1. Install the dependencies

	   Run the install command for your package manager.

	2. Create your content directory

	   Add a `content/` folder with your Markdown files.

	3. Start the dev server

	   Run `npm run dev` and visit localhost.
	{% /steps %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A numbered list | The steps, one per item |
| Or a heading per step | A step: the heading and the content under it, up to the next |
| `---` inside a heading-based step | Splits the step's media (before) from its text (after) |
| A heading one level above the step headings, with a short paragraph before and a paragraph after, ahead of the first step | The eyebrow, headline and blurb ([Page sections](/docs/concepts/page-sections)) |
| A paragraph before a numbered list | The blurb |

## Heading-based steps

Headings are automatically converted into steps instead of list items.

{% preview source=true %}

	{% steps %}
	### Clone the repository

	Fork and clone the repo to your local machine.

	### Install dependencies

	Run `npm install` to set up all packages.

	### Run the tests

	Verify everything works with `npm test`.
	{% /steps %}

{% /preview %}

## Place a step's media

Individual steps (heading-delimited blocks) accept the shared media+content layout vocabulary — the body splits on `---` into **media → content** zones (media-first in source); `media-position` controls visual placement.

`media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:steps"} /%}
