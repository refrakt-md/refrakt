---
title: Swatch
description: Inline color chip for referencing colors in prose
---

{% hint type="note" %}
This rune is part of **@refrakt-md/design**. Install with `npm install @refrakt-md/design` and add `"@refrakt-md/design"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Swatch

An inline color chip for referencing colors within body text. Self-closing — no children needed.

## Basic usage

Reference a color inline with a visual chip.

{% preview source=true %}

The primary brand color is {% swatch color="#2563EB" label="Blue" /%} and the accent is {% swatch color="#7C3AED" label="Purple" /%}.

{% /preview %}

## Show hex value

Add `showValue` to display the hex code alongside the label.

{% preview source=true %}

Use {% swatch color="#10B981" label="Success" showValue=true /%} for confirmation states and {% swatch color="#EF4444" label="Danger" showValue=true /%} for destructive actions.

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `color` | `string` | — | Hex color value (required) |
| `label` | `string` | — | Display name for the color (required) |
| `showValue` | `boolean` | `false` | Show the hex value after the label |
