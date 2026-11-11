---
title: Nord preset
description: Nord — Arctic, north-bluish color palette with integrated canvas. Frost, Aurora, Polar Night, Snow Storm.
---

# Nord

Nord is an arctic, north-bluish palette in four groups: **Polar Night** (dark canvas), **Snow Storm** (light canvas and text), **Frost** (cool blue accents) and **Aurora** (warm accents). Its hues were tuned against their own canvases, so the preset ships chrome, code surface and syntax together, in light and dark. It splits `type` (Frost mint) from `function` (Frost cyan) and gives numbers and regex their own Aurora hues.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/nord"]
    }
  }
}
```

## Palette

{% palette title="Nord — light" tint="nord" tint-mode="light" showContrast=true showA11y=true %}
- Polar Night nord0 / Text (variable): #2e3440
- Polar Night nord3 / Comment: #4c566a
- Snow Storm nord6 / Canvas (code-bg): #eceff4
- Frost nord7 / Mint (type, attribute): #8fbcbb
- Frost nord8 / Cyan (function): #88c0d0
- Frost nord9 / Deep blue (operator): #81a1c1
- Frost nord10 / Deep navy (keyword, tag): #5e81ac
- Aurora nord12 / Orange (number): #d08770
- Aurora nord13 / Yellow (regex): #ebcb8b
- Aurora nord14 / Green (string): #a3be8c
- Aurora nord15 / Purple (constant): #b48ead
{% /palette %}

{% palette title="Nord — dark" tint="nord" tint-mode="dark" showContrast=true showA11y=true %}
- Polar Night nord0 / Canvas (code-bg): #2e3440
- Snow Storm nord4 / Text (variable, punctuation): #d8dee9
- Snow Storm 'nord3.5' / Comment: #616e88
- Frost nord7 / Mint (type, attribute): #8fbcbb
- Frost nord8 / Cyan (function): #88c0d0
- Frost nord9 / Deep blue (keyword, tag, operator): #81a1c1
- Aurora nord13 / Yellow (regex): #ebcb8b
- Aurora nord14 / Green (string): #a3be8c
- Aurora nord15 / Purple (constant, number): #b48ead
{% /palette %}

## Preview

{% codegroup tint="nord" %}
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

Nord is the work of [Arctic Ice Studio](https://arcticicestudio.com/) and Sven Greb, MIT licensed. The preset is derived from their [published palette](https://www.nordtheme.com/docs/colors-and-palettes); see [nordtheme.com](https://www.nordtheme.com/).
