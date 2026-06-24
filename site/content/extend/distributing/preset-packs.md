---
title: Authoring preset packs
description: Ship token-override presets independent of a theme
---

# Authoring preset packs

A **preset** is pure data — a `ThemeTokensConfig` of token overrides merged
last-wins over a theme's base values. A **preset pack** ships one or more
presets independent of any theme.

```bash
npx create-refrakt my-presets --type preset-pack --scope @acme
```

## Package shape

```
my-presets/
  presets.json      — the pack manifest
  src/ember.json    — a ThemeTokensConfig (declarative JSON, the default carrier)
```

Presets are **declarative JSON** by default — no build step, so the pack is
publishable the moment it's written. (A `.ts`/`.js` module exporting a
`ThemeTokensConfig` works too; the loader accepts either.)

## The manifest

```jsonc
{
  "name": "@acme/my-presets",
  "refrakt": ">=0.25 <0.26",
  "presets": [
    { "id": "ember",   "title": "Ember",   "scope": "syntax",
      "module": "./src/ember.json" },
    { "id": "midnight", "title": "Midnight", "scope": "palette",
      "module": "./src/midnight.json", "tunedFor": ["@refrakt-md/lumina"] }
  ]
}
```

### Scope — the mood-vs-skeleton boundary

- **`syntax`** — touches only `syntax.*` (+ optionally `color.code.*`).
  Theme-universal by construction.
- **`palette`** — also sets chrome tokens (`color.bg`/`text`/`primary`/…).
  Reskins the page; tune it to a canvas.

`refrakt theme presets validate` flags a `syntax` preset that actually sets
chrome ("really a palette preset").

### Compatibility — `tunedFor`

Advisory only. List the theme(s) a `palette` preset was designed against;
absence means universal. Applying a preset outside its `tunedFor` set is **never
an error** — the universal contract guarantees it recolours without breaking
geometry — but `refrakt theme presets list` flags the mismatch.

## Editor support

Each JSON preset declares `"$schema": "https://refrakt.md/schemas/vX.Y/theme-tokens.json"`,
giving validation and autocomplete against the universal token contract.

## A preset is also a tint

The same module powers a site-wide reskin (`theme.presets`) or a scoped accent
(`tints[].extends`). The engine guarantees a preset-as-tint can only project
mood, never structure — `scope` and tint-eligibility are the same boundary.

## Use it

```bash
refrakt theme presets list                 # discover installed packs + presets
refrakt theme presets install @acme/my-presets --use ember
```
