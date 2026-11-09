---
title: HowTo
description: Step-by-step how-to guide with tools and instructions
category: Learning
plugin: learning
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:howto"} /%}

Instructions for a task: what it needs, and the steps to follow, published as structured data.

## Basic usage

A how-to guide with required tools and numbered steps.

{% preview source=true %}

	{% howto estimatedTime="PT1H" difficulty="medium" %}
	# How to Set Up a Development Environment

	Get a local development environment running from scratch.

	- Node.js 18+
	- Git
	- A code editor (VS Code recommended)

	1. Install Node.js from the official website
	2. Clone the repository with `git clone`
	3. Run `npm install` to install dependencies
	4. Start the dev server with `npm run dev`
	{% /howto %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A short paragraph, then a heading and a paragraph, before the lists | The eyebrow, headline and blurb ([Page sections](/docs/authoring/page-sections)) |
| A bulleted list | The tools and materials needed |
| A numbered list | The steps |

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:howto"} /%}
