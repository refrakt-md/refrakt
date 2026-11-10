---
title: Spacing
description: Spacing scale, border radius, and shadow token display
category: Design
plugin: design
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:spacing"} /%}

Displays a design system's spacing scale, border radii and shadows as documentation.

{% hint type="note" %}
**Not the `spacing` attribute.** This rune *renders a design system's spacing scale* as documentation. The universal `spacing` attribute — which adjusts the rhythm around any block rune — is a different thing with the same name; see [Surfaces](/docs/concepts/surfaces#spacing-and-inset).
{% /hint %}

## Full token set

A complete spacing system with scale, radii, and shadows.

{% preview source=true %}

	{% spacing title="Design Tokens" %}
	## Spacing
	- unit: 4px
	- scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32

	## Radius
	- sm: 4px
	- md: 8px
	- lg: 12px
	- full: 9999px

	## Shadows
	- sm: 0 1px 2px rgba(0,0,0,0.05)
	- md: 0 4px 6px rgba(0,0,0,0.1)
	- lg: 0 10px 15px rgba(0,0,0,0.1)
	{% /spacing %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A `Spacing` heading, then `unit:` and `scale:` list items | The spacing scale, built from the unit and the comma-separated steps |
| A `Radius` heading, then `name: value` list items | A sample of each radius |
| A `Shadows` heading, then `name: value` list items | A sample of each shadow |

## Spacing scale only

Show just the spacing scale without radii or shadows.

{% preview source=true %}

	{% spacing title="Spacing Scale" %}
	## Spacing
	- unit: 8px
	- scale: 0, 1, 2, 3, 4, 6, 8, 12, 16
	{% /spacing %}

{% /preview %}

## Radius and shadows

Document visual tokens without a spacing scale.

{% preview source=true %}

	{% spacing title="Visual Tokens" %}
	## Radius
	- none: 0
	- sm: 4px
	- md: 8px
	- lg: 16px
	- pill: 9999px

	## Shadows
	- subtle: 0 1px 2px rgba(0,0,0,0.04)
	- card: 0 4px 12px rgba(0,0,0,0.08)
	- elevated: 0 12px 24px rgba(0,0,0,0.12)
	{% /spacing %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:spacing"} /%}
