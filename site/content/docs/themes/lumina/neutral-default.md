---
title: Neutral default
description: Lumina's quiet warm-neutral palette — body colours, syntax palette, status palette, and typography.
---

# Neutral default

Lumina ships with a quiet warm-neutral palette designed to disappear behind your content. The brand identity lives in the prism mark and the typographic chrome; the colour palette stays out of the way. This is what every new `npm create refrakt` project sees out of the box, and what the docs site you're reading uses as its chrome (with the [niwaki](/docs/themes/lumina/presets/niwaki) preset layered on for syntax).

The palette walks a deliberately narrow chroma band — warm neutrals from `#f6f4ef` (light bg) to `#1c1a17` (text), with status colours muted enough to read as functional rather than decorative.

## Body palette

The surface, text, and primary tokens for light mode.

{% palette title="Light mode" showContrast=true showA11y=true %}
- Background: #f6f4ef
- Text: #1c1a17
- Muted: #6b6661
- Border: #e8e5df
- Primary: #1c1a17
- Surface: #fcfaf6
- Surface raised: #ffffff
{% /palette %}

Dark mode inverts to warm-near-black, with text lifted to the same warm off-white the page surface uses in light.

{% palette title="Dark mode" showContrast=true showA11y=true %}
- Background: #1c1a17
- Text: #f6f4ef
- Muted: #94908a
- Border: #2d2926
- Primary: #f6f4ef
- Surface: #232017
- Surface raised: #2a2622
{% /palette %}

`primary` is intentionally monochromatic — it shadows `text`. Buttons, links, and accents render in body-text colour, slightly shifted on hover. The brand identity lives in chrome and the prism mark, not in a coloured accent.

## Status palette

Four sentiments at a single saturation/lightness band so no sentiment is more aggressive than another. Light values; dark mode lifts each toward the surface.

{% palette title="Status — light" showContrast=true %}
## Info
- Base: #34547a
- Background: #e8edf4
- Border: #c5d2e0

## Warning
- Base: #9c5a18
- Background: #f5ebd9
- Border: #e0c9a3

## Danger
- Base: #a83232
- Background: #f5e0e0
- Border: #e0b8b8

## Success
- Base: #2d6a3e
- Background: #e0eee4
- Border: #b8d4be
{% /palette %}

A live look at how the sentiments read against the page surface:

{% hint type="note" %}
Refrakt sites are statically generated; content updates require a rebuild.
{% /hint %}

{% hint type="warning" %}
The legacy `@refrakt-md/legacy` package was retired in v0.14.0.
{% /hint %}

{% hint type="caution" %}
This command will overwrite existing token values in your config file.
{% /hint %}

{% hint type="check" %}
Your refrakt site built successfully — 47 pages emitted in 2.1 seconds.
{% /hint %}

## Syntax palette — the quiet spectrum walk

Five hues that walk teal → violet → rust → ochre → sage — cool, cool, warm, warm, cool/warm. Spectrum-adjacent without shouting. Used on every code surface unless a preset (like [niwaki](/docs/themes/lumina/presets/niwaki)) overrides.

{% palette title="Syntax roles — light" showContrast=true %}
- Keyword (teal): #2a5c63
- Function (slate violet): #4a3b6e
- String (rust): #8a3a3a
- Number (ochre): #876327
- Type (sage): #3a5c2a
- Comment (warm muted): #8a857d
- Punctuation: #6b6661
{% /palette %}

{% palette title="Syntax roles — dark" showContrast=true %}
- Keyword: #7eb6bc
- Function: #a89bc7
- String: #c79a9a
- Number: #d4b07e
- Type: #94b385
- Comment: #6b6661
- Punctuation: #94908a
{% /palette %}

## Typography

Inter for body and UI; JetBrains Mono for code. Both loaded from Google Fonts with `font-display: swap` and preconnect hints.

{% typography title="Lumina default" %}
- body: Inter (400, 500, 700)
- mono: JetBrains Mono (400, 500)
{% /typography %}

## Opting out

The neutral default is the unconditional starting point — there's no config snippet to "opt in" to it. To override individual tokens, add `theme.tokens`:

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "tokens": {
        "color": {
          "primary": "#7c3aed"
        }
      }
    }
  }
}
```

To swap to a different colour identity entirely, layer in a preset. See [Tideline](/docs/themes/lumina/presets/tideline) for the cream-and-navy preset that restores Lumina's pre-v0.14.0 appearance, or [Niwaki](/docs/themes/lumina/presets/niwaki) for Japanese-garden syntax colours.
