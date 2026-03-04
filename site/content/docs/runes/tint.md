---
title: Tint
description: Section-level colour overrides via CSS custom properties
---

# Tint

Override colour tokens within a single rune's scope. The tint rune produces no visible output — it modifies how the containing section renders by setting `--tint-*` CSS custom properties and `data-tint` attributes.

## Named tint (attribute form)

The simplest form. Reference a named tint defined in the theme configuration as an attribute on any block rune.

{% preview source=true %}

{% hint type="note" tint="warm" %}
This hint uses a **warm** tint from the theme. The colours come from the theme's `tints.warm` definition.
{% /hint %}

{% /preview %}

## Inline tint (child rune form)

For one-off colour overrides. Token values are defined as list items inside the tint body. The tint must be the first child of the parent rune.

{% preview source=true %}

{% hint type="check" %}

{% tint %}
- background: #ecfdf5
- accent: #059669
- border: #a7f3d0
{% /tint %}

This hint has custom colours defined inline. Only the listed tokens are overridden — unlisted ones fall through to the page defaults.

{% /hint %}

{% /preview %}

## Colour scheme override

The `mode` attribute forces dark or light mode on a section, regardless of the user's OS preference.

{% preview source=true %}

{% hint type="note" %}

{% tint mode="dark" %}
- background: #1e293b
- primary: #e2e8f0
- accent: #38bdf8
- border: #334155
{% /tint %}

This section is forced into **dark mode** with custom token values.

{% /hint %}

{% /preview %}

## Light and dark definitions

Provide separate token sets for light and dark colour schemes using headings inside the tint body.

```markdoc
{% hint type="note" %}

{% tint %}
## Light
- background: #fdf6e3
- primary: #5c4a32
- accent: #c47d3b
- border: #e0d5c0

## Dark
- background: #2a2118
- primary: #e8d5b7
- accent: #e0a86e
- border: #4a3f33
{% /tint %}

This section adapts its warm tint to both colour schemes.

{% /hint %}
```

When no headings are present, all tokens are treated as light-mode values. The `## Light` heading is only needed when `## Dark` is also present.

## Preset with overrides

Start from a named tint and override specific tokens.

```markdoc
{% hint type="note" %}

{% tint preset="warm" %}
- accent: #e94560
{% /tint %}

Inherits all tokens from the "warm" preset, with a custom accent colour.

{% /hint %}
```

## Mode-only (no colour tokens)

Switch the colour scheme without custom colours using the `tint-mode` attribute directly on the parent rune.

```markdoc
{% hero layout="full" tint-mode="dark" %}
# Welcome
Build something amazing.
{% /hero %}
```

This applies the theme's standard dark mode styles without any custom colour tokens.

## Token set

The tint rune operates on six colour tokens, namespaced as `--tint-*`:

| Token | CSS Property | Purpose |
|-------|-------------|---------|
| `background` | `--tint-background` | Section background colour |
| `surface` | `--tint-surface` | Raised surface colour (cards, panels) |
| `primary` | `--tint-primary` | Primary text colour |
| `secondary` | `--tint-secondary` | Secondary/muted text colour |
| `accent` | `--tint-accent` | Accent colour (links, highlights) |
| `border` | `--tint-border` | Border and divider colour |

Tokens are namespaced as `--tint-*` rather than directly overriding theme tokens. The theme's CSS bridges the two with fallbacks:

```css
[data-tint] {
  --rf-color-bg: var(--tint-background, var(--rf-color-bg));
  --rf-color-text: var(--tint-primary, var(--rf-color-text));
  --rf-color-primary: var(--tint-accent, var(--rf-color-primary));
  /* ... */
}
```

## Attributes

### On the `tint` child rune

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `preset` | `string` | — | Named tint from theme config as starting point |
| `mode` | `string` | `"auto"` | Colour scheme: `auto`, `dark`, or `light` |

### On any parent rune

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `tint` | `string` | — | Named tint from theme config |
| `tint-mode` | `string` | — | Colour scheme override: `auto`, `dark`, or `light` |

## Identity transform output

The tint rune adds attributes and inline styles to the parent rune's root element:

| Output | Condition | Example |
|--------|-----------|---------|
| `data-tint` | Named or inline tint | `data-tint="warm"` or `data-tint="custom"` |
| `data-color-scheme` | Mode is not `auto` | `data-color-scheme="dark"` |
| `data-tint-dark` | Dark tokens provided | `data-tint-dark` |
| `--tint-*` styles | Light tokens | `style="--tint-background: #fdf6e3"` |
| `--tint-dark-*` styles | Dark tokens | `style="--tint-dark-background: #2a2118"` |
| `--tinted` modifier | Tokens present | `.rf-hint--tinted` |

## Nesting

Tints can nest. An inner tint overrides an outer tint within its scope. CSS custom property inheritance handles this naturally.

```markdoc
{% hero tint="dark" layout="full" %}
# Our Recipes

{% hint tint="warm" %}
This hint has warm colours inside a dark hero.
{% /hint %}

{% /hero %}
```

## Theme configuration

Themes define named tints in their configuration. Light values are set as inline styles (no FOUC). Dark values are provided by the theme's CSS.

```javascript
// theme config
tints: {
  warm: {
    light: {
      background: '#fdf6e3',
      primary: '#5c4a32',
      accent: '#c47d3b',
      border: '#e0d5c0',
    },
    dark: {
      background: '#2a2118',
      primary: '#e8d5b7',
      accent: '#e0a86e',
      border: '#4a3f33',
    },
  },
  dark: {
    mode: 'dark',
    dark: {
      background: '#1a1a2e',
      primary: '#e0e0e0',
      accent: '#e94560',
    },
  },
}
```

A theme without tint bridge CSS simply ignores tint tokens — the section renders with page defaults.
