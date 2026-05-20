---
title: Gruvbox preset
description: Pavel Pertsev's warm retro palette — earthy oranges, deep greens, mustard yellows. The lineup's only warm palette.
---

# Gruvbox

Gruvbox is Pavel Pertsev's warm retro palette — earthy oranges, deep greens, mustard yellows, and Mediterranean reds on a coffee-and-cream canvas. It's the **only warm palette** in the SPEC-057 lineup, a deliberate counterweight to five blue/cool members. The catalog needed visual variety; Gruvbox provides it.

Gruvbox is also the most "unix terminal heritage" of the lineup. The original Gruvbox was a Vim colorscheme, and the syntax conventions trace from that lineage — Statement keywords in red, function definitions in yellow, types in green, constants in purple — rather than the modern editor-theme scene's bluer conventions.

Phase 1 ships **light medium + dark medium**, the canonical contrast pair. Gruvbox also ships "soft" and "hard" contrast levels per mode; those defer to a future milestone if there's demand. MIT licensed.

This page is rendered on a site whose active preset is **niwaki**. The Gruvbox look you see in the palettes and the live preview below is scoped to those subtrees via `tint="gruvbox"` — the surrounding prose stays in niwaki.

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

Both modes ship together; system preference or user toggle picks between them.

## The palette

Gruvbox's hues are organised as "neutral / faded / bright" triads — faded for light mode, bright for dark mode, with neutral as the mid-contrast point. The mode-flipped backgrounds (`bg0` `#fbf1c7` cream / `#282828` charcoal) are the recognisable signature; the accents shift saturation to maintain contrast on whichever canvas they're on.

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

## Live preview

The shared TypeScript+JSX snippet rendered through Gruvbox. Notice the warm-spectrum identity: **keywords** in red, **functions** in yellow, **types** in green, **numbers** in purple. Sitting on the cream / charcoal canvas, the palette reads as "retro terminal" — a visible contrast with the cool-Nordic feel of Nord or the neon-modern feel of Tokyo Night.

{% codegroup tint="gruvbox" %}
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

Gruvbox exercises **4 of 7** SPEC-056 extended roles distinctly in dark mode: `type` (Green) ≠ `function` (Yellow), `regex` (Orange) ≠ `string` (Green), `operator` (Orange), `attribute` (Blue) ≠ `function`. `number` collapses with `constant` (both purple) — Gruvbox's intent.

## Composing with tideline

`presets: ["tideline", "gruvbox"]` gives tideline's IBM Plex typography with Gruvbox's warm chrome and syntax:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/gruvbox"
    ]
  }
}
```

Tideline's Plex Sans + Plex Mono pairs surprisingly well with Gruvbox's warm palette — the humanist letterforms feel more at home on cream-coloured paper than on cool surfaces.

## Other contrast levels

Phase 1 ships only "medium" contrast in both light and dark. Gruvbox publishes "soft" (lower contrast) and "hard" (higher contrast) variants per mode. If you'd like those as separate presets (`gruvbox-soft`, `gruvbox-hard`), [open an issue](https://github.com/refrakt-md/refrakt/issues/new).

## Attribution

Gruvbox is the work of [Pavel Pertsev (morhetz)](https://github.com/morhetz), released under the MIT licence. The refrakt preset module at `@refrakt-md/lumina/presets/gruvbox` is derived from the [gruvbox.vim source](https://github.com/morhetz/gruvbox/blob/master/colors/gruvbox.vim) and the [palette specification](https://github.com/morhetz/gruvbox#palette). Gruvbox has remained one of the most-installed Vim colorschemes for over a decade.
