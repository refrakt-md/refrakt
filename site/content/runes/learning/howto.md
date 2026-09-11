---
title: HowTo
description: Step-by-step how-to guide with tools and instructions
category: Learning
plugin: learning
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/learning**. Install with `npm install @refrakt-md/learning` and add `"@refrakt-md/learning"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# HowTo

Step-by-step how-to instructions. Unordered lists become tools/materials needed, ordered lists become steps.

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

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:howto"} /%}

## Section header

How-to supports an optional eyebrow, headline, and blurb above the section above the steps. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

