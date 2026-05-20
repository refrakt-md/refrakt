---
title: Tokyo Night preset
description: Neon-on-night palette by Enkia. Day + Storm canonical pair. The lineup's most aggressive role-splitter.
---

# Tokyo Night

Tokyo Night is Enkia's blue-magenta-cyan palette, inspired by the neon-on-night aesthetic of the city it's named for. Three variants: **Storm** (the canonical dark), **Moon** (lighter dark), and **Day** (light). Phase 1 of the SPEC-057 lineup ships the canonical pair — Storm + Day. Moon defers to a future milestone.

Tokyo Night is the **role-split champion** of the lineup. It deliberately uses distinct hues for `type`, `function`, `parameter`, `keyword`, `number`, `tag`, and `attribute` — the SPEC-056 extended-role contract was sized around palettes like Tokyo Night, so if any palette validates the widening, this is the one that does. MIT licensed.

This page is rendered on a site whose active preset is **niwaki**. The Tokyo Night look you see in the palettes and the live preview below is scoped to those subtrees via `tint="tokyo-night"` — the surrounding prose stays in niwaki.

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

Day and Storm ship together; user toggle or system preference picks between them.

## The palette

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

Storm carries Tokyo Night's signature look — the magenta keywords and lavender text on deep blue-black canvas. Day inverts the canvas axis while keeping the same role splits.

## Live preview

The shared TypeScript+JSX snippet rendered through Tokyo Night. Pay attention to:

- **Type** (`User`) reads in cyan, distinct from **function** (`findUser`) in blue
- **Parameters** (`id` in declaration position) read in yellow — Tokyo Night's distinct parameter hue
- **JSX tags** (`<Button>`) in punchy red, distinct from keywords in magenta
- **JSX attributes** (`onClick`, `variant`) in yellow — same as parameters by Tokyo Night's intent
- **Numbers** (`42`) in orange, distinct from strings in green

{% codegroup tint="tokyo-night" %}
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

Tokyo Night exercises **6+ of the 7** SPEC-056 extended optional roles distinctly in dark mode — the highest count in the Phase 1 lineup. If you're picking a palette specifically to show off SPEC-056's widening, this is the one.

## Composing with tideline

`presets: ["tideline", "tokyo-night"]` pairs tideline's IBM Plex typography with Tokyo Night's neon canvas:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/tokyo-night"
    ]
  }
}
```

Tideline's Plex Sans + Plex Mono survive; Tokyo Night's chrome and syntax win.

## Other variants

Phase 1 ships only Storm + Day. Tokyo Night Moon — a slightly lighter dark variant some readers prefer — defers to a future milestone. If you'd like Moon as a separate preset, [open an issue](https://github.com/refrakt-md/refrakt/issues/new).

## Attribution

Tokyo Night is the work of [Enkia](https://github.com/enkia) and contributors, released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/tokyo-night` is derived from the [Tokyo Night VS Code theme source](https://github.com/enkia/tokyo-night-vscode-theme), specifically the Storm and Day variants.
