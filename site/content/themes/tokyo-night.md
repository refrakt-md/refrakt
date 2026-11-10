---
title: Tokyo Night preset
description: Neon-on-night palette by Enkia. Day + Storm canonical pair. The lineup's most aggressive role-splitter.
---

# Tokyo Night

Tokyo Night is Enkia's blue-magenta-cyan palette, after the neon-on-night look of the city it's named for. It is the lineup's **role-split champion**: `type`, `function`, `parameter`, `keyword`, `number`, `tag` and `attribute` each get a distinct hue — pick it to show off the extended syntax roles. The preset ships **Storm** (dark) and **Day** (light); the Moon variant is not included.

## Opt in

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/tokyo-night"]
    }
  }
}
```

## Palette

{% palette title="Tokyo Night — Day (light)" tint="tokyo-night" tint-mode="light" showContrast=true showA11y=true %}
- Background (canvas): #e1e2e7
- Foreground (text, variable): #3760bf
- Comment (muted): #848cb5
- Magenta (keyword): #9854f1
- Blue (function, primary): #2e7de9
- Cyan (type): #007197
- Green (string): #587539
- Orange (constant, number, attribute, parameter): #b15c00
- Red (tag): #f52a65
- Teal-cyan (operator): #006c86
- Teal (regex): #387068
{% /palette %}

{% palette title="Tokyo Night — Storm (dark)" tint="tokyo-night" tint-mode="dark" showContrast=true showA11y=true %}
- Background (canvas): #24283b
- Foreground (text, variable, punctuation): #c0caf5
- Comment (muted): #565f89
- Magenta (keyword): #bb9af7
- Blue (function, primary): #7aa2f7
- Cyan (type): #7dcfff
- Cyan-blue (operator): #89ddff
- Green (string): #9ece6a
- Yellow (attribute, parameter): #e0af68
- Orange (constant, number): #ff9e64
- Red (tag): #f7768e
- Light cyan (regex): #b4f9f8
{% /palette %}

## Preview

{% codegroup tint="tokyo-night" %}
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

Tokyo Night is the work of [Enkia](https://github.com/enkia) and contributors, MIT licensed. The preset is derived from the Storm and Day variants of the [Tokyo Night VS Code theme](https://github.com/enkia/tokyo-night-vscode-theme).
