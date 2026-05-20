---
title: Lumina
description: Refrakt's flagship theme — neutral default palette, two opt-in presets, and the design token contract.
---

# Lumina

Lumina is refrakt's flagship theme. It ships with a quiet warm-neutral palette designed to disappear behind your content, plus two opt-in presets that demonstrate refrakt's preset architecture.

| Surface | Renders | When to use |
|---|---|---|
| [Neutral default](/themes/neutral-default) | Warm-neutral chrome, monochrome primary, quiet-spectrum syntax | Anything that wants the user's brand to lead — docs sites, blogs, marketing pages for the user's brand |
| [Tideline](/themes/tideline) | Cream paper + maritime navy + IBM Plex Sans/Mono | Personal sites, brand-forward marketing where a touch of nostalgic paperliness fits |
| [Niwaki](/themes/niwaki) | Japanese-garden syntax palette on whatever chrome sits beneath | Code-heavy docs that want a signature without overhauling chrome |

## How presets work

A *preset* is a named `ThemeTokensConfig` shipped as a module. Sites opt in via the `theme.presets` array in `refrakt.config.json`:

```jsonc
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/tideline"]
    }
  }
}
```

Presets merge in declared order, last-write-wins per token. The refrakt documentation site you're reading right now uses `presets: ["@refrakt-md/lumina/presets/niwaki"]` — code blocks render in Japanese-garden colours; everything else stays neutral.

## Compose them

Presets compose. Use both tideline and niwaki together for tideline chrome (Plex + cream + navy) plus niwaki syntax (Japanese-garden code):

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

Order matters — later presets override earlier ones for any token they both define. Since niwaki overrides only the syntax tokens, it composes cleanly with anything else.

## Authoring custom presets

A preset is any module that exports a `ThemeTokensConfig` as default. Drop it next to your site or publish it as a package — the same `theme.presets` array accepts both package specifiers and relative paths.

See [Theme Configuration](/docs/themes/config-api) for the full `ThemeTokensConfig` shape.
