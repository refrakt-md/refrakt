---
title: Tint
description: Section-level color overrides via CSS custom properties
category: Backgrounds & color
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:tint"} /%}

Recolor a single rune: a hint, a hero, a card. The tint rune shows nothing itself; it changes the colors of the rune it sits in. To tint a whole page or section of the site from frontmatter, see [Tint and color scheme](/docs/concepts/tint).

## Basic usage

Most tints are named ones the theme defines, applied with a `tint` attribute on the rune itself:

{% preview source=true %}

	{% hint type="note" tint="warm" %}
	This hint uses a **warm** tint from the theme. The colors come from the theme's `tints.warm` definition.
	{% /hint %}

{% /preview %}

Tints nest: a tinted rune inside another tinted rune takes its own colors.

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list item `name: value`, such as `- primary: #059669` | That color token, set to the value |
| A `Dark` heading | The list items after it are the dark-scheme values |
| A `Light` heading, or no heading | The list items are the light-scheme values |
| A list item whose name is not a tint token, or any other content | Ignored |

## Set colors inline

For a one-off color, put `{% tint %}` first inside the rune and list the colors to change. Colors you don't list keep the page's values.

{% preview source=true %}

	{% hint type="check" %}

		{% tint %}
		- bg: #ecfdf5
		- primary: #059669
		- border: #a7f3d0
		{% /tint %}

		This hint has custom colors defined inline. Only the listed tokens are overridden — unlisted ones fall through to the page defaults.

	{% /hint %}

{% /preview %}

A tint sets up to six colors, each replacing the theme's color of the same role:

| Token | Purpose |
|-------|---------|
| `bg` | Background |
| `surface` | Raised surfaces, such as cards and panels |
| `text` | Body text |
| `muted` | Secondary text |
| `primary` | Links and accents |
| `border` | Borders and dividers |

## Give dark and light values

Under a `## Light` and a `## Dark` heading, list the colors for each color scheme. Without headings, every value is a light value.

{% preview source=true %}

	{% hint type="note" %}

		{% tint %}
		## Light
		- bg: #fdf6e3
		- text: #5c4a32
		- primary: #c47d3b
		- border: #e0d5c0

		## Dark
		- bg: #2a2118
		- text: #e8d5b7
		- primary: #e0a86e
		- border: #4a3f33
		{% /tint %}

		This section adapts its warm tint to both color schemes.

	{% /hint %}

{% /preview %}

## Adjust a named tint

`preset` starts from a named tint; the colors you list replace its own.

{% preview source=true %}

	{% hint type="note" %}

		{% tint preset="warm" %}
		- primary: #e94560
		{% /tint %}

		Inherits all tokens from the "warm" preset, with a custom primary color.

	{% /hint %}

{% /preview %}

## Force dark or light

`mode` keeps the rune in dark or light whatever the reader's setting:

{% preview source=true %}

	{% hint type="note" %}

		{% tint mode="dark" %}
		- bg: #1e293b
		- text: #e2e8f0
		- primary: #38bdf8
		- border: #334155
		{% /tint %}

		This section is forced into **dark mode** with custom token values.

	{% /hint %}

{% /preview %}

To switch the scheme without changing any colors, set `tint-mode` on the rune instead: `{% hero tint-mode="dark" %}`.

## Where named tints come from

A named tint (`tint="warm"`, `preset="warm"`) is defined by the theme, or by the site's `tints` map in `refrakt.config.json` — see [Sites](/docs/configuration/sites). A theme that defines no tints ignores tint colors, and the rune keeps the page's colors. How a theme defines tints is covered in [theme authoring → tint cascade](/extend/theme-authoring/tint-cascade#named-tints-and-the-css-bridge).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:tint"} /%}
