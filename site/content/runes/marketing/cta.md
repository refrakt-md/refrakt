---
title: CTA
description: Focused call-to-action blocks with headlines, descriptions, and action buttons
category: Marketing
plugin: marketing
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:cta"} /%}

A focused call-to-action block. Headings become the headline, paragraphs become the subtitle, and list items with links become action buttons. Code fences become copyable command blocks. Use CTA for action prompts that can appear anywhere on a page — for full-width intro sections, use [Hero](/runes/marketing/hero) instead.

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

## Section header

CTA supports an optional eyebrow, headline, and blurb above the headline and description. Place a short paragraph before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:cta"} /%}

## How it is built

CTA is a [composition](/extend/rune-authoring/composed-runes): a Markdown file that places a [`section`](/runes/section) at `display` [prominence](/runes/surfaces) and an [`actions`](/runes/actions) list. It renders no `rf-cta` classes, and its `data-rune` is `cta`. The `call-to-action` alias is gone; `refrakt migrate cta <paths> --apply` renames it. A CTA inside a pricing table is no longer left-aligned for you: write `align="start"`.

{% snippet path="plugins/marketing/runes/cta.md" /%}
