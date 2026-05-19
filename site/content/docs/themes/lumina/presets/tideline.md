---
title: Tideline preset
description: Cream paper + maritime navy, with IBM Plex Sans and Plex Mono. The warm-branded preset.
---

# Tideline

Tideline is the warm-branded preset — cream-and-maritime-navy across body, surface, status, and code. Named for the line where land meets water; the cream reads as paper/sand, the navy as deep water.

For users upgrading from pre-v0.14.0 Lumina, tideline restores the original cream-and-navy look with one deliberate upgrade: typography moves from Outfit to **IBM Plex Sans** (body) and **IBM Plex Mono** (code) per the SPEC-051 v1.0 cleanup.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/tideline"]
    }
  }
}
```

If you specifically depended on the Outfit font, pin it back via `theme.tokens.font.sans` after opting in:

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/tideline"],
      "tokens": {
        "font": {
          "sans": "'Outfit', system-ui, sans-serif"
        }
      }
    }
  }
}
```

## Palette

{% palette title="Tideline — light" showContrast=true showA11y=true %}
- Background: #faf5eb
- Text: #1d3557
- Muted: #5a7a90
- Border: #d8e4de
- Primary (cerulean): #457b9d
- Primary hover: #376585
- Surface: #fffbf2
- Surface hover: #fdf0d5
- Surface raised: #ffffff
{% /palette %}

{% palette title="Tideline — dark" tint-mode="dark" showContrast=true showA11y=true %}
- Background: #152238
- Text: #f1faee
- Muted: #a8dadc
- Primary: #70b4c0
- Primary hover: #a8dadc
- Surface: #1a2940
{% /palette %}

### Primary scale (cerulean → frosted blue)

{% palette title="Primary scale" %}
- Primary: #f0f6f9, #dcebf0, #b8d6e2, #a8dadc, #70b4c0, #457b9d, #376585, #1d3557, #182c4a, #12213a, #0c162a
{% /palette %}

### Status

{% palette title="Status — light" showContrast=true %}
## Info
- Base: #457b9d
- Background: #edf4f8
- Border: #a8dadc

## Warning
- Base: #c8900a
- Background: #fdf5e4
- Border: #edd49a

## Danger
- Base: #e63946
- Background: #fdeced
- Border: #f0b0b5

## Success
- Base: #3d8f65
- Background: #ecf5ef
- Border: #a8d4b8
{% /palette %}

## Code surface

Tideline keeps the distinctive "code on navy" treatment: code blocks render on a saturated navy background with off-white text, even in light mode. The high-contrast code surface is part of the brand identity.

| Token | Light | Dark |
|---|---|---|
| `color.code.bg` | `#1d3557` | `#152238` |
| `color.code.text` | `#f1faee` | `#f1faee` |
| `color.code.inline-bg` | `#f9ebcc` | `rgba(168, 218, 220, 0.08)` |

Syntax colours are mustard-keyword + frosted-blue (no relation to the niwaki spectrum):

{% palette title="Syntax — light" %}
- Keyword: #f2cc8f
- Function: #70b4c0
- String: #a8dadc
- Number: #e8c07a
- Comment: #5a7a90
{% /palette %}

## Typography

{% typography title="Tideline" %}
- body: IBM Plex Sans (400, 500, 600, 700)
- mono: IBM Plex Mono (400, 500)
{% /typography %}

Plex Sans is humanist, slightly warm — pairs more naturally with the cream-paper / maritime-navy palette than Outfit's geometric leanings did — and the matching Plex Mono gives tideline a cohesive Plex-family identity (Sans + Mono designed to work together).

## Composing with niwaki

`presets: ["tideline", "niwaki"]` gives tideline chrome (Plex + cream + navy) with niwaki-coloured code blocks instead of tideline's frosted-blue syntax. Useful when you like the warm-paper feel for the page but want the Japanese-garden code identity. See [Niwaki](/docs/themes/lumina/presets/niwaki) for the composition example.
