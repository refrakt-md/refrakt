---
title: Reveal
description: Progressive disclosure where content appears step by step
category: Content
plugin: core
status: stable
type: rune
---

# Reveal

Progressive disclosure. Headings become reveal steps, with content shown one step at a time.

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

## Section header

Reveal supports an optional eyebrow, headline, and blurb above the steps. Place a short paragraph or heading before your step headings to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Attributes

#### `reveal`

{% include file="rune-attributes.md" variables={r: "rune:reveal"} /%}

#### `reveal-step`

{% include file="rune-attributes.md" variables={r: "rune:reveal-step"} /%}

