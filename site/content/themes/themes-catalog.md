---
title: Themes
description: Refrakt's flagship Lumina theme plus the curated lineup of syntax presets — Nord, Dracula, Solarized, Catppuccin, Tokyo Night, One Dark, Gruvbox, Niwaki.
---

# Themes

Refrakt ships with **Lumina**, a complete theme covering chrome (page bg, surfaces, typography, primary, status), code-surface tokens, and syntax highlighting. Lumina is what every new `npm create refrakt` project sees out of the box.

Layered on top of Lumina are **presets** — named `ThemeTokensConfig` modules that override a scope-eligible subset of the contract. Two kinds:

- **Theme presets** override chrome (typography, body bg, surfaces). They reshape the entire visual identity of a site. Layer one on Lumina via `theme.presets` in `refrakt.config.json`.
- **Syntax presets** override syntax highlighting (and optionally code-surface canvas + chrome accents). They reshape how code reads, optionally with their own canvas. Two flavours: **scoped** presets like niwaki touch only the foreground; **integrated** presets like Nord ship chrome + canvas + foreground together. Layer alongside or instead of a chrome preset.

Both can be opt-in as the **active** preset for a whole site, or registered as a named **tint** (`theme.tints[].extends`) for inline scoped use on a single section or code block. See [Tint cascade](/extend/theme-authoring/tint-cascade) for the scoping mechanics and [Theme authoring](/extend/theme-authoring/overview) if you're building your own.

## Lumina

- [Lumina](/themes/lumina) — overview of the flagship theme
- [Neutral default](/themes/neutral-default) — the warm-neutral palette every fresh site sees

## Theme presets

- [Tideline](/themes/tideline) — cream paper + maritime navy + IBM Plex Sans/Mono. Brand-forward, nostalgic.

## refrakt's syntax presets

- [Niwaki](/themes/niwaki) — Japanese-garden syntax palette (wakaba, sakura, matsu, momiji, ishi). Foreground-only; composes with any chrome.

## Imported syntax presets

A curated lineup of widely-recognised palettes, ported as integrated refrakt presets. Each one is opt-in as a site preset *or* as a scoped tint for inline showcases.

| Preset | Style | Modes | Notable role splits |
|---|---|---|---|
| [Nord](/themes/nord) | Arctic Frost + Aurora on Polar Night | Light + Dark | type vs function (Frost-7 vs Frost-8) |
| [Dracula](/themes/dracula) | Purple/pink/cyan on near-black | Dark only | type (Cyan) vs function (Green); regex (Red) vs string (Yellow) |
| [Solarized](/themes/solarized) | Same 16 hues across both modes | Light + Dark (mode-symmetric accents) | type (Yellow), number (Orange), regex (Green), operator (Violet) — full SPEC-056 spread |
| [Catppuccin](/themes/catppuccin) | Soft pastel — Latte + Mocha | Light + Dark | parameter (Maroon — distinct from variable); 6 of 7 extended roles |
| [Tokyo Night](/themes/tokyo-night) | Neon-on-night — Day + Storm | Light + Dark | 6 of 7 extended roles distinct; the lineup's role-split champion |
| [One Dark](/themes/one-dark) | Atom's signature blue-grey + warm accents | Dark only | type (Yellow), regex (Cyan), operator (Cyan), tag (Red) |
| [Gruvbox](/themes/gruvbox) | Warm retro — earthy oranges and deep greens | Light + Dark | The lineup's only warm palette; Unix terminal heritage |

All seven imports are **integrated** palettes — they claim chrome + canvas + foreground together. Niwaki remains the only scoped syntax preset, where the foreground tokens override but chrome inherits from whatever theme sits beneath.

## Build your own

A theme is just a `ThemeTokensConfig` object exported from a module. See [Theme authoring](/extend/theme-authoring/overview) for the contract surface, [Creating a theme](/extend/theme-authoring/creating-a-theme) for a walkthrough, and [Tint cascade](/extend/theme-authoring/tint-cascade) for how scoped tints compose.
