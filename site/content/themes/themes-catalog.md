---
title: Themes
description: Refrakt's flagship Lumina theme plus its chrome and syntax presets — neutral default, tideline, niwaki, nord.
---

# Themes

Refrakt ships with **Lumina**, a complete theme covering chrome (page bg, surfaces, typography, primary, status), code-surface tokens, and syntax highlighting. Lumina is what every new `npm create refrakt` project sees out of the box.

Layered on top of Lumina are **presets** — named `ThemeTokensConfig` modules that override a scope-eligible subset of the contract. Two kinds:

- **Theme presets** override chrome (typography, body bg, surfaces). They reshape the entire visual identity of a site. Layer one on Lumina via `theme.presets` in `refrakt.config.json`.
- **Syntax presets** override syntax highlighting (and optionally code-surface canvas + chrome accents). They reshape how code reads without forcing the rest of the page to change. Layer alongside or instead of a chrome preset.

Both can be opt-in as the **active** preset for a whole site, or registered as a named **tint** (`theme.tints[].extends`) for inline scoped use on a single section or code block. See [Tint cascade](/docs/themes/tint-cascade) for the scoping mechanics and [Theme authoring](/docs/themes/overview) if you're building your own.

## Lumina

- [Lumina](/themes/lumina) — overview of the flagship theme
- [Neutral default](/themes/neutral-default) — the warm-neutral palette every fresh site sees

## Theme presets

- [Tideline](/themes/tideline) — cream paper + maritime navy + IBM Plex Sans/Mono. Brand-forward, nostalgic.

## Syntax presets

- [Niwaki](/themes/niwaki) — Japanese-garden syntax palette (wakaba, sakura, matsu, momiji, ishi). Foreground-only; composes with any chrome.
- [Nord](/themes/nord) — Arctic, north-bluish integrated palette (Polar Night, Snow Storm, Frost, Aurora). Chrome + canvas + foreground.

## Build your own

A theme is just a `ThemeTokensConfig` object exported from a module. See [Theme authoring](/docs/themes/overview) for the contract surface, [Creating a theme](/docs/themes/creating-a-theme) for a walkthrough, and [Tint cascade](/docs/themes/tint-cascade) for how scoped tints compose.
