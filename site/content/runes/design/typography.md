---
title: Typography
description: Font specimen display with live Google Fonts loading
category: Design
plugin: design
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/design**. Install with `npm install @refrakt-md/design` and add `"@refrakt-md/design"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Typography

Displays font specimens with live-loaded typefaces. List items are parsed as `role: Family Name (weight1, weight2)`. Supported roles: `heading`, `body`, `mono`, `display`, `caption`.

## Basic usage

Define a font system with roles and weights.

{% preview source=true %}

{% typography title="Font System" %}
- heading: Inter (600, 700)
- body: Inter (400, 500)
- mono: JetBrains Mono (400, 500)
{% /typography %}

{% /preview %}

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

{% typography title="Monospace" showCharset="true" %}
- mono: Fira Code (400, 500, 700)
{% /typography %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:typography"} /%}

