---
title: Gruvbox preset
description: Pavel Pertsev's warm retro palette — earthy oranges, deep greens, mustard yellows. The lineup's only warm palette.
---

# Gruvbox

Gruvbox is Pavel Pertsev's warm retro palette — earthy oranges, deep greens and mustard yellows on a coffee-and-cream canvas, and the **only warm palette** in the catalog. Born as a Vim colorscheme, it keeps terminal conventions: keywords in red, functions in yellow, types in green, constants in purple. The preset ships the **medium** contrast level in light and dark; the soft and hard levels are not included.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/gruvbox"]
    }
  }
}
```

## Palette

{% palette title="Gruvbox — light medium" tint="gruvbox" tint-mode="light" showContrast=true showA11y=true %}
- bg0 (canvas): #fbf1c7
- bg1 (surface): #ebdbb2
- fg1 (text, variable): #3c3836
- gray (comment, muted): #928374
- faded_red (keyword, tag): #9d0006
- faded_orange (regex, operator): #af3a03
- faded_yellow (function): #b57614
- faded_green (string, type): #79740e
- faded_aqua (string-expression): #427b58
- faded_blue (primary, attribute): #076678
- faded_purple (constant, number): #8f3f71
{% /palette %}

{% palette title="Gruvbox — dark medium" tint="gruvbox" tint-mode="dark" showContrast=true showA11y=true %}
- bg0 (canvas): #282828
- bg1 (surface): #3c3836
- fg1 (text, variable, punctuation): #ebdbb2
- gray (comment, muted): #928374
- bright_red (keyword, tag): #fb4934
- bright_orange (regex, operator): #fe8019
- bright_yellow (function): #fabd2f
- bright_green (string, type): #b8bb26
- bright_aqua (string-expression): #8ec07c
- bright_blue (primary, attribute): #83a598
- bright_purple (constant, number): #d3869b
{% /palette %}

## Preview

{% codegroup tint="gruvbox" %}
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

Gruvbox is the work of [Pavel Pertsev (morhetz)](https://github.com/morhetz), MIT licensed. The preset is derived from [gruvbox.vim](https://github.com/morhetz/gruvbox/blob/master/colors/gruvbox.vim) and its [palette specification](https://github.com/morhetz/gruvbox#palette).
