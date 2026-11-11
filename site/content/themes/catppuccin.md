---
title: Catppuccin preset
description: Soft pastel palette family — Latte (light) + Mocha (dark). Modern, well-documented, integrated chrome + canvas + syntax.
---

# Catppuccin

Catppuccin is a soft-pastel palette family with an unusually thorough syntax style guide: every hue has a name and a documented role. It is one of the few palettes to give **function parameters** their own hue (Maroon), and it colors six of the seven extended syntax roles distinctly. The preset ships the canonical pair — **Latte** for light, **Mocha** for dark; the Frappé and Macchiato flavors are not included.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/catppuccin"]
    }
  }
}
```

## Palette

{% palette title="Catppuccin — Latte (light)" tint="catppuccin" tint-mode="light" showContrast=true showA11y=true %}
- Base (canvas): #eff1f5
- Mantle (surface): #e6e9ef
- Text (variable): #4c4f69
- Overlay0 (comment): #9ca0b0
- Mauve (keyword, tag): #8839ef
- Blue (function, attribute, primary): #1e66f5
- Yellow (type): #df8e1d
- Green (string): #40a02b
- Peach (constant, number): #fe640b
- Pink (regex, string-expression): #ea76cb
- Sky (operator): #04a5e5
- Maroon (parameter): #e64553
- Lavender (primary-hover): #7287fd
{% /palette %}

{% palette title="Catppuccin — Mocha (dark)" tint="catppuccin" tint-mode="dark" showContrast=true showA11y=true %}
- Base (canvas): #1e1e2e
- Mantle (surface): #181825
- Text (variable): #cdd6f4
- Overlay0 (comment): #6c7086
- Mauve (keyword, tag): #cba6f7
- Blue (function, attribute, primary): #89b4fa
- Yellow (type): #f9e2af
- Green (string): #a6e3a1
- Peach (constant, number): #fab387
- Pink (regex, string-expression): #f5c2e7
- Sky (operator): #89dceb
- Maroon (parameter): #eba0ac
- Lavender (primary-hover): #b4befe
{% /palette %}

## Preview

{% codegroup tint="catppuccin" %}
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

Catppuccin is the work of [the Catppuccin organization](https://github.com/catppuccin) and contributors, MIT licensed. The preset is derived from the [official palette](https://catppuccin.com/palette/) and the [syntax style guide](https://github.com/catppuccin/catppuccin#-style-guide).
