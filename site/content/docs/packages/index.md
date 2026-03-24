---
title: Community Packages
description: Installing and configuring official and custom rune packages
---

# Community Packages

refrakt.md separates its rune library into focused packages. Core runes (grid, hint, tabs, nav, datatable, etc.) are available in every project without any additional installation. Domain-specific runes — marketing, storytelling, API documentation, and more — are distributed as community packages that you install as needed.

## Official Packages

| Package | Purpose | Features |
|---------|---------|----------|
| [`@refrakt-md/marketing`](/docs/runes/marketing) | Landing pages and conversion content | 8 runes |
| [`@refrakt-md/docs`](/docs/runes/docs) | Technical API documentation | 3 runes |
| [`@refrakt-md/design`](/docs/runes/design) | Design system documentation | 7 runes, cross-page token pipeline |
| [`@refrakt-md/learning`](/docs/runes/learning) | Educational and instructional content | 2 runes, SEO rich snippets |
| [`@refrakt-md/storytelling`](/docs/runes/storytelling) | Fiction, world-building, and narrative | 7 runes |
| [`@refrakt-md/business`](/docs/runes/business) | Organizational and team content | 3 runes |
| [`@refrakt-md/places`](/docs/runes/places) | Events, maps, and travel | 3 runes |
| [`@refrakt-md/media`](/docs/runes/media) | Music and audio content | 3 runes |
| [`@refrakt-md/plan`](/docs/runes/plan) | Spec-driven project planning | 9 runes, [8 CLI commands](/docs/runes/plan/cli), cross-page pipeline |

## Installing Packages

Install one or more packages with npm:

```bash
npm install @refrakt-md/marketing @refrakt-md/docs
```

Then register them in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte",
  "packages": [
    "@refrakt-md/marketing",
    "@refrakt-md/docs"
  ]
}
```

That's it. The Vite plugin loads the packages at build time, merges their rune schemas and theme configs, and makes their tags available in all your content files.

## Configuration Options

### `packages`

An array of npm package names to load. Packages are loaded in order; later entries take precedence when resolving name conflicts (see `prefer` below).

```json
{
  "packages": ["@refrakt-md/marketing", "@refrakt-md/storytelling"]
}
```

### `runes.prefer`

When two packages define a rune with the same name, use `prefer` to specify which package wins. Use `"__core__"` to force the built-in core rune to take precedence.

```json
{
  "packages": ["@my-org/custom", "@refrakt-md/marketing"],
  "runes": {
    "prefer": {
      "hero": "@my-org/custom",
      "hint": "__core__"
    }
  }
}
```

### `runes.aliases`

Create additional tag names that resolve to an existing rune. Useful for site-specific shorthand or migrating from a previous tag name.

```json
{
  "runes": {
    "aliases": {
      "callout": "hint",
      "note": "hint"
    }
  }
}
```

### `runes.local`

Load rune implementations from local files without publishing to npm. Paths are resolved relative to `refrakt.config.json`.

```json
{
  "runes": {
    "local": {
      "game-item": "./src/runes/game-item.ts",
      "game-spell": "./src/runes/game-spell.ts"
    }
  }
}
```

Local runes take highest priority over any installed package runes of the same name. They are ideal for project-specific runes or runes under active development.

## How Packages Work

Each community package exports a `RunePackage` object containing:

- **Rune schemas** — Markdoc transforms that define how the tag is parsed and what it outputs
- **Theme config** — BEM block names, modifiers, and structural config for the identity transform
- **Icons** — SVG icon groups used by the package's runes
- **Pipeline hooks** _(optional)_ — Build-time hooks for cross-page indexing and enrichment
- **CLI plugins** _(optional)_ — Additional CLI commands (e.g., `refrakt plan` from `@refrakt-md/plan`)

The Vite plugin merges all packages together before each build, resolving collisions and assembling the final rune set that the content pipeline uses. Packages that provide CLI commands register them automatically when the package is installed.

See [Building a Custom Package](/docs/packages/authoring) for details on authoring your own packages, and [Cross-Page Pipeline](/docs/packages/pipeline) for packages that need to build site-wide indexes.
