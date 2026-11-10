---
title: Tint
description: Section-level color overrides via CSS custom properties
category: Backgrounds & color
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:tint"} /%}

Override color tokens within a single rune's scope. The tint rune produces no visible output — it modifies how the containing section renders by setting `--tint-*` CSS custom properties and `data-tint` attributes.

This page covers the rune and its attributes. To set a tint or color scheme for a whole page or subtree from frontmatter (`tint`, `tint-mode`, `tint-lock`), see [Tint and color scheme](/docs/concepts/tint); for how a theme implements tints, see [theme authoring → tint cascade](/extend/theme-authoring/tint-cascade).

## Named tint (attribute form)

The simplest form. Reference a named tint defined in the theme configuration as an attribute on any block rune.

{% preview source=true %}

	{% hint type="note" tint="warm" %}
	This hint uses a **warm** tint from the theme. The colors come from the theme's `tints.warm` definition.
	{% /hint %}

{% /preview %}

## Inline tint (child rune form)

For one-off color overrides. Token values are defined as list items inside the tint body. The tint must be the first child of the parent rune.

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

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list item `name: value`, such as `- primary: #059669` | That color token, set to the value |
| A `Dark` heading | The list items after it are the dark-scheme values |
| A `Light` heading, or no heading | The list items are the light-scheme values |
| A list item whose name is not a tint token, or any other content | Ignored |

## Color scheme override

The `mode` attribute forces dark or light mode on a section, regardless of the user's OS preference.

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

## Light and dark definitions

Provide separate token sets for light and dark color schemes using headings inside the tint body.

```markdoc
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
```

When no headings are present, all tokens are treated as light-mode values. The `## Light` heading is only needed when `## Dark` is also present.

## Preset with overrides

Start from a named tint and override specific tokens.

```markdoc
{% hint type="note" %}

	{% tint preset="warm" %}
	- primary: #e94560
	{% /tint %}

	Inherits all tokens from the "warm" preset, with a custom primary color.

{% /hint %}
```

## Mode-only (no color tokens)

Switch the color scheme without custom colors using the `tint-mode` attribute directly on the parent rune.

```markdoc
{% hero layout="full" tint-mode="dark" %}
# Welcome
Build something amazing.
{% /hero %}
```

This applies the theme's standard dark mode styles without any custom color tokens.

## Token set

A tint sets up to six colors. Each replaces the theme's own color of the same role inside the tinted rune:

| Token | Purpose |
|-------|---------|
| `bg` | Background |
| `surface` | Raised surfaces, such as cards and panels |
| `text` | Body text |
| `muted` | Secondary text |
| `primary` | Links and accents |
| `border` | Borders and dividers |

## Tint without a child rune

A rune that takes a tint also accepts `tint` and `tint-mode` directly, with no `{% tint %}` inside it: `{% hint tint="warm" %}`.

## Nesting

Tints can nest. An inner tint overrides an outer tint within its scope. CSS custom property inheritance handles this naturally.

```markdoc
{% hero tint="dark" layout="full" %}
	# Our Recipes

	{% hint tint="warm" %}
	This hint has warm colors inside a dark hero.
	{% /hint %}

{% /hero %}
```

## Where named tints come from

A named tint (`tint="warm"`, `preset="warm"`) is defined by the theme, or by the site's `tints` map in `refrakt.config.json` — see [Sites](/docs/configuration/sites). A theme that defines no tints, or ships no tint CSS, ignores tint tokens and the section renders with the page defaults. How a theme defines tints and maps the tokens onto its colors is covered in [theme authoring → tint cascade](/extend/theme-authoring/tint-cascade#named-tints-and-the-css-bridge).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:tint"} /%}
