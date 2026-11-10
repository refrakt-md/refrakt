---
title: Dracula preset
description: The iconic dark theme — purple, pink, cyan, and green on near-black. Integrated chrome + canvas + syntax.
---

# Dracula

Dracula is the most-installed dark editor theme around: purple, pink, cyan and green accents on a near-black canvas. It splits `type` (Cyan) from `function` (Green) and `regex` (Red) from `string` (Yellow). **Dark-only** — Dracula has no light variant, so pair it with `colorScheme: "dark"` or light-mode pages keep Lumina's light chrome.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/dracula"],
      "colorScheme": "dark"
    }
  }
}
```

## Palette

{% palette title="Dracula" tint="dracula" tint-mode="dark" showContrast=true showA11y=true %}
- Background (canvas): #282a36
- Current Line (surface): #44475a
- Foreground (text, variable): #f8f8f2
- Comment (muted): #6272a4
- Cyan (type): #8be9fd
- Green (function, attribute): #50fa7b
- Orange (constant alt): #ffb86c
- Pink (keyword, tag, operator): #ff79c6
- Purple (primary, constant, number): #bd93f9
- Red (regex): #ff5555
- Yellow (string): #f1fa8c
{% /palette %}

## Preview

{% codegroup tint="dracula" %}
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

Dracula is the work of [Zeno Rocha](https://zenorocha.com/) and contributors, MIT licensed. The preset is derived from the [official palette specification](https://spec.draculatheme.com/); see [draculatheme.com](https://draculatheme.com/).
