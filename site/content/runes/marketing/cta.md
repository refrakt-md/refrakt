---
title: CTA
description: Focused call-to-action blocks with headlines, descriptions, and action buttons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:cta"} /%}

A focused call to action: a headline, a line of copy, and the buttons or install command that act on it. It can appear anywhere on a page; for a full-width opening band at the top of one, use [hero](/runes/marketing/hero).

## Basic usage

A headline with a description and action buttons.

{% preview source=true %}

	{% cta %}
	# Get Started with refrakt.md

	Build structured content sites with semantic Markdown.

	- [Quick Start](/docs/getting-started)
	- [View on GitHub](https://github.com)
	{% /cta %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph | The eyebrow, headline and blurb ([Page sections](/docs/authoring/page-sections)) |
| More headings and paragraphs | Further copy under the blurb |
| A list of links | A row of buttons; the first link is the primary action |
| A code fence | A copyable command line beside the buttons |

## With command block

Code fences inside a CTA become copyable command blocks.

{% preview source=true %}

	{% cta %}
	# Install refrakt.md

	Get up and running in seconds.

	```shell
	npm install @refrakt-md/runes
	```
	{% /cta %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:cta"} /%}
