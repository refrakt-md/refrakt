---
title: Typography
description: Font specimen display with live Google Fonts loading
category: Design
plugin: design
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:typography"} /%}

Displays font specimens for a design system's typefaces, loading each font live.

## Basic usage

Define a font system with roles and weights.

{% preview source=true %}

	{% typography title="Font System" %}
	- heading: Inter (600, 700)
	- body: Inter (400, 500)
	- mono: JetBrains Mono (400, 500)
	{% /typography %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list item `role: Family (600, 700)` | A specimen of that font in each listed weight; the role is `heading`, `body`, `mono`, `display` or `caption` |
| A list item with no weights, such as `body: Inter` | A specimen at weight 400 |

## Custom sample text

Use the `sample` attribute to display custom text in specimens.

{% preview source=true %}

	{% typography title="Display Fonts" sample="Design is intelligence made visible" %}
	- display: Playfair Display (400, 700)
	- body: Source Sans 3 (400, 600)
	{% /typography %}

{% /preview %}

## Single specimen

A typography rune can show a single font for focused documentation.

{% preview source=true %}

	{% typography title="Monospace" showCharset=true %}
	- mono: Fira Code (400, 500, 700)
	{% /typography %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:typography"} /%}
