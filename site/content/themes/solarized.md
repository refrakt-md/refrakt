---
title: Solarized preset
description: Ethan Schoonover's iconic 16-hue palette with mode-symmetric accents on flipped canvases. Light and dark from the same family.
---

# Solarized

Solarized is Ethan Schoonover's 2011 sixteen-hue palette, built on one constraint: **the eight accent hues are identical in light and dark mode** — only the base tones flip, from `base3` (`#fdf6e3`) cream to `base03` (`#002b36`) deep teal. It uses the extended syntax roles thoroughly: `type` (Yellow), `number` (Orange), `regex` (Green) and `operator` (Violet) all get their own hue.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/solarized"]
    }
  }
}
```

## Palette

{% palette title="Solarized — light" tint="solarized" tint-mode="light" showContrast=true showA11y=true %}
- base3 (canvas): #fdf6e3
- base2 (surface): #eee8d5
- base1 (muted): #93a1a1
- base0 (dark text): #839496
- base00 (light text): #657b83
- base01 (comments dark): #586e75
- base02 (dark surface): #073642
- base03 (dark canvas): #002b36
- Yellow (type): #b58900
- Orange (number): #cb4b16
- Red (keyword, tag): #dc322f
- Magenta (string-expression): #d33682
- Violet (constant, operator): #6c71c4
- Blue (function, attribute, primary): #268bd2
- Cyan (string): #2aa198
- Green (regex, comment-alt): #859900
{% /palette %}

{% palette title="Solarized — dark" tint="solarized" tint-mode="dark" showContrast=true showA11y=true %}
- base03 (canvas): #002b36
- base02 (surface): #073642
- base01 (muted, comments): #586e75
- base00 (light text): #657b83
- base0 (dark text): #839496
- base1 (light muted): #93a1a1
- Yellow (type): #b58900
- Orange (number): #cb4b16
- Red (keyword, tag): #dc322f
- Magenta (string-expression): #d33682
- Violet (constant, operator): #6c71c4
- Blue (function, attribute, primary): #268bd2
- Cyan (string): #2aa198
- Green (regex): #859900
{% /palette %}

## Preview

{% codegroup tint="solarized" %}
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

Solarized is the work of [Ethan Schoonover](https://ethanschoonover.com/), MIT licensed. The preset is derived from the [official Solarized site](https://ethanschoonover.com/solarized/).
