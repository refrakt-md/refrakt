---
title: Tideline preset
description: Cream paper + maritime navy, with IBM Plex Sans and Plex Mono. The warm-branded preset.
---

# Tideline

Tideline is the warm-branded preset — cream-and-maritime-navy across body, surface, status, and code. Named for the line where land meets water; the cream reads as paper/sand, the navy as deep water.

For users upgrading from pre-v0.14.0 Lumina, tideline restores the original cream-and-navy look with one deliberate upgrade: typography moves from Outfit to **IBM Plex Sans** (body) and **IBM Plex Mono** (code) per the SPEC-051 v1.0 cleanup.

This page is rendered on a site whose active preset is **niwaki**. The Tideline look you see in the palettes and the live preview below is scoped to those subtrees via `tint="tideline"` — the surrounding prose stays in niwaki.

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

{% palette title="Tideline — light" tint="tideline" tint-mode="light" showContrast=true showA11y=true %}
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

{% palette title="Tideline — dark" tint="tideline" tint-mode="dark" showContrast=true showA11y=true %}
- Background: #152238
- Text: #f1faee
- Muted: #a8dadc
- Primary: #70b4c0
- Primary hover: #a8dadc
- Surface: #1a2940
{% /palette %}

### Primary scale (cerulean → frosted blue)

{% palette title="Primary scale" tint="tideline" %}
- Primary: #f0f6f9, #dcebf0, #b8d6e2, #a8dadc, #70b4c0, #457b9d, #376585, #1d3557, #182c4a, #12213a, #0c162a
{% /palette %}

### Status

{% palette title="Status — light" tint="tideline" tint-mode="light" showContrast=true %}
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

{% palette title="Syntax — light" tint="tideline" tint-mode="light" %}
- Keyword: #f2cc8f
- Function: #70b4c0
- String: #a8dadc
- Constant: #e8c07a
- Comment: #5a7a90
- Variable: #b8d6e2
{% /palette %}

{% palette title="Syntax — dark" tint="tideline" tint-mode="dark" %}
- Keyword: #f2cc8f
- Function: #a8dadc
- String: #a8dadc
- Constant: #e8c07a
- Comment: #5a7a90
- Punctuation: #70b4c0
- Variable: #b8d6e2
{% /palette %}

## Live preview

Here's the same TypeScript+JSX snippet used across the preset doc pages, rendered through Tideline's full integrated look — chrome, syntax colours, and the canonical navy code canvas.

{% codegroup tint="tideline" %}
```ts
// A small user-service shape — exercises the SPEC-056 role splits
interface User {
  id: number;
  name: string;
  preferences: Record<string, unknown>;
}

async function findUser(id: number): Promise<User | null> {
  const re = /^\d+$/;
  if (!re.test(String(id))) return null;
  const user = await db.users.findOne({ where: { id } });
  return user ?? null;
}

const widget = <Button onClick={() => findUser(42)} variant="primary">Find</Button>;
```
{% /codegroup %}

Tideline's syntax palette was authored at the 9-role tier and doesn't set {% ref "SPEC-056" preview="drawer" /%}'s extended roles (`type`, `tag`, `attribute`, `operator`, `number`, `regex`). Those fall back through the broad-mapping derivation — type and attribute paint like function, tag like keyword, operator like punctuation. Compare with [Nord](/themes/nord) to see what the extended-role splits look like in practice.

## Typography

{% typography title="Tideline" %}
- body: IBM Plex Sans (400, 500, 600, 700)
- mono: IBM Plex Mono (400, 500)
{% /typography %}

Plex Sans is humanist, slightly warm — pairs more naturally with the cream-paper / maritime-navy palette than Outfit's geometric leanings did — and the matching Plex Mono gives tideline a cohesive Plex-family identity (Sans + Mono designed to work together).

## Composing with niwaki

`presets: ["tideline", "niwaki"]` gives tideline chrome (Plex + cream + navy) with niwaki-coloured code blocks instead of tideline's frosted-blue syntax. Useful when you like the warm-paper feel for the page but want the Japanese-garden code identity. See [Niwaki](/themes/niwaki) for the composition example.
