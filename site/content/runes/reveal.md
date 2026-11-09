---
title: Reveal
description: Progressive disclosure where content appears step by step
category: Disclosure
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:reveal"} /%}

Progressive disclosure. Headings become reveal steps, with content shown one step at a time. To let the reader open any panel in any order, use [accordion](/runes/accordion); for one collapsible block, use [details](/runes/details); to switch between alternatives, use [tabs](/runes/tabs).

## Basic usage

Headings automatically split content into reveal steps.

{% preview source=true %}

	{% reveal %}
	### Step 1: Install the package

	Run the install command to add refrakt.md to your project.

	### Step 2: Configure your theme

	Set up the lumina theme in your config file.

	### Step 3: Write content

	Create Markdown files with runes and watch them transform.
	{% /reveal %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph, before the first step heading | The eyebrow, headline and blurb ([Page sections](/docs/authoring/page-sections)) |
| A heading | A step's title; the content up to the next heading of the same level is the step |

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:reveal"} /%}
