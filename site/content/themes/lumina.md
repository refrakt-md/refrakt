---
title: Lumina
description: Refrakt's flagship theme — a neutral default palette, nine opt-in presets, and how presets are enabled, composed and previewed.
---

# Lumina

Lumina is refrakt's flagship theme and what every new `npx create-refrakt` project starts with. Out of the box it renders the [neutral default](/themes/neutral-default): a quiet warm-neutral palette designed to disappear behind your content. On top of that it ships **nine opt-in presets** — two of refrakt's own ([Tideline](/themes/tideline) and [Niwaki](/themes/niwaki)) and seven ported editor palettes. The [themes catalog](/themes/themes-catalog) lists them all and helps you choose.

## Opt in to a preset

A preset is a named `ThemeTokensConfig` module. Enable one with the `theme.presets` array in `refrakt.config.json`:

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

Presets that ship both modes follow the reader's system preference or the color-scheme toggle. The dark-only presets ([Dracula](/themes/dracula), [One Dark](/themes/one-dark)) have no light values, so add `"colorScheme": "dark"` beside `presets`, or light-mode pages keep Lumina's light chrome.

## Compose presets

Presets merge in the order you list them, last write wins per token, so a later preset overrides only the tokens it defines. Two common combinations:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": [
      "@refrakt-md/lumina/presets/tideline",
      "@refrakt-md/lumina/presets/niwaki"
    ]
  }
}
```

- **Tideline + Niwaki** — Tideline's chrome (Plex type, cream paper, navy) with Niwaki's syntax colors. Niwaki sets only syntax tokens, so it composes cleanly with anything.
- **Tideline + an integrated palette** (Nord, Solarized, Catppuccin, …) — the palette's chrome, code canvas and syntax win, while Tideline's IBM Plex typography survives in both modes. With a dark-only palette, Tideline's light chrome stays as it is.

This documentation site uses `presets: ["@refrakt-md/lumina/presets/niwaki"]` on the neutral default.

## How the preset pages are rendered

Each preset page is rendered on this site, whose active preset is Niwaki. The palettes and the code preview on a preset page are scoped to that preset with the `tint="<preset>"` attribute, so they show its colors while the surrounding prose stays in Niwaki. The site registers every preset as a named tint:

```jsonc
{
  "site": {
    "tints": {
      "nord": { "extends": "@refrakt-md/lumina/presets/nord" }
    }
  }
}
```

The same mechanism lets you show any preset inside one section of your own site. See [Tint and color scheme](/docs/concepts/tint) for the scoping rules.

## Authoring custom presets

A preset is any module that exports a `ThemeTokensConfig` as default. Drop it next to your site or publish it as a package — `theme.presets` accepts both package specifiers and relative paths. See [Theme Configuration](/extend/theme-authoring/config-api) for the full `ThemeTokensConfig` shape.
