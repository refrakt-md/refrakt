---
title: Themes
description: Choose a look for your refrakt site — the Lumina theme and its nine presets, Tideline, Niwaki, Nord, Dracula, Solarized, Catppuccin, Tokyo Night, One Dark and Gruvbox.
---

# Themes

Every refrakt site is styled by **Lumina**, refrakt's flagship theme. It covers the whole page — background, surfaces, typography, links, status colors, code blocks and syntax highlighting — and on its own renders the quiet [neutral default](/themes/neutral-default). **Presets** restyle Lumina: each one is a set of token overrides you add to your config, and you can combine them.

To choose one, ask three questions:

- **Light, dark or both?** Most presets ship both modes and follow the reader's preference. Dracula and One Dark are dark-only.
- **How much should code say?** Presets differ in how many syntax roles they color separately — types, parameters, numbers, regex, operators, tags, attributes. Tokyo Night, Catppuccin and Solarized split the most; Niwaki and Tideline keep to the nine base roles.
- **Warm or cool?** Tideline (cream and navy) and Gruvbox (earthy retro) are warm; Nord, Tokyo Night and One Dark are cool; Niwaki recolors only code, so the page keeps whatever chrome is beneath it.

Each preset page shows its palette and a live code preview. To enable a preset, or combine two, see [Lumina](/themes/lumina#opt-in-to-a-preset).

## Lumina

- [Lumina](/themes/lumina) — opting in to presets, composing them, and authoring your own
- [Neutral default](/themes/neutral-default) — the warm-neutral palette every fresh site sees

## Theme presets

- [Tideline](/themes/tideline) — cream paper + maritime navy + IBM Plex Sans/Mono. Brand-forward, nostalgic.

## refrakt's syntax presets

- [Niwaki](/themes/niwaki) — Japanese-garden syntax palette (wakaba, sakura, matsu, momiji, ishi). Foreground-only; composes with any chrome.

## Imported syntax presets

A curated lineup of widely recognized palettes, ported as integrated refrakt presets. Each one is opt-in as a site preset *or* as a scoped tint for inline showcases.

| Preset | Style | Modes | Notable role splits |
|---|---|---|---|
| [Nord](/themes/nord) | Arctic Frost + Aurora on Polar Night | Light + Dark | type vs function (Frost-7 vs Frost-8) |
| [Dracula](/themes/dracula) | Purple/pink/cyan on near-black | Dark only | type (Cyan) vs function (Green); regex (Red) vs string (Yellow) |
| [Solarized](/themes/solarized) | Same 16 hues across both modes | Light + Dark (mode-symmetric accents) | type (Yellow), number (Orange), regex (Green), operator (Violet) — the full extended-role spread |
| [Catppuccin](/themes/catppuccin) | Soft pastel — Latte + Mocha | Light + Dark | parameter (Maroon — distinct from variable); 6 of 7 extended roles |
| [Tokyo Night](/themes/tokyo-night) | Neon-on-night — Day + Storm | Light + Dark | 6 of 7 extended roles distinct; the lineup's role-split champion |
| [One Dark](/themes/one-dark) | Atom's signature blue-grey + warm accents | Dark only | type (Yellow), regex (Cyan), operator (Cyan), tag (Red) |
| [Gruvbox](/themes/gruvbox) | Warm retro — earthy oranges and deep greens | Light + Dark | The lineup's only warm palette; Unix terminal heritage |

All seven imports are **integrated** palettes — they claim chrome + canvas + foreground together. Niwaki remains the only scoped syntax preset, where the foreground tokens override but chrome inherits from whatever theme sits beneath.

## Build your own

A theme is just a `ThemeTokensConfig` object exported from a module. See [Theme authoring](/extend/theme-authoring/overview) for the contract surface, [Creating a theme](/extend/theme-authoring/creating-a-theme) for a walkthrough, and [Tint cascade](/extend/theme-authoring/tint-cascade) for how scoped tints compose.
