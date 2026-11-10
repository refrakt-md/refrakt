---
title: Tideline preset
description: Cream paper + maritime navy, with IBM Plex Sans and Plex Mono. The warm-branded preset.
---

# Tideline

Tideline is refrakt's own warm-branded preset: cream paper and maritime navy across body, surfaces, status and code, named for the line where land meets water. It is the one preset that also sets typography — **IBM Plex Sans** for text, **IBM Plex Mono** for code — and it renders code on navy even in light mode. Its syntax colors set only the nine base roles, so types paint like functions and tags like keywords.

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

To keep the colors but use another typeface, override `theme.tokens.font.sans` (for example `"'Outfit', system-ui, sans-serif"`) after opting in.

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

{% palette title="Primary scale" tint="tideline" %}
- Primary: #f0f6f9, #dcebf0, #b8d6e2, #a8dadc, #70b4c0, #457b9d, #376585, #1d3557, #182c4a, #12213a, #0c162a
{% /palette %}

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

{% typography title="Tideline" %}
- body: IBM Plex Sans (400, 500, 600, 700)
- mono: IBM Plex Mono (400, 500)
{% /typography %}

## Preview

{% codegroup tint="tideline" %}
```ts
// A small user-service shape
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

## Attribution

Original to refrakt; ships in `@refrakt-md/lumina` under the MIT license. IBM Plex is by IBM, under the SIL Open Font License.
