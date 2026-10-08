---
title: Plugins
description: Browse the official refrakt plugins, install them, and configure how the rune set resolves.
---

# Plugins

A **plugin** is an npm package that extends refrakt with extra runes, layouts, theme config, pipeline hooks, behaviors, and/or CLI commands. Core runes (grid, hint, tabs, nav, datatable, …) ship in every project automatically; domain-specific runes are distributed as separate `@refrakt-md/*` packages so you only install what you need.

## Official plugins

| Plugin | Use it for | Highlights |
|--------|------------|------------|
| [`@refrakt-md/marketing`](/runes/marketing) | Landing pages and conversion content | 8 runes — hero, cta, feature, pricing, testimonial, bento, steps, comparison |
| [`@refrakt-md/docs`](/runes/docs) | Technical API documentation | 3 runes — api, symbol, changelog |
| [`@refrakt-md/design`](/runes/design) | Design system documentation | 7 runes, cross-page token pipeline |
| [`@refrakt-md/learning`](/runes/learning) | Educational and instructional content | 2 runes, SEO rich snippets |
| [`@refrakt-md/storytelling`](/runes/storytelling) | Fiction, world-building, and narrative | 7 runes — character, realm, faction, lore, plot, bond, storyboard |
| [`@refrakt-md/business`](/runes/business) | Organizational and team content | 3 runes — cast, organization, timeline |
| [`@refrakt-md/places`](/runes/places) | Events, maps, and travel | 3 runes — event, map, itinerary |
| [`@refrakt-md/media`](/runes/media) | Music and audio content | 3 runes — playlist, track, audio |
| [`@refrakt-md/plan`](/runes/plan) | Spec-driven project planning | 9 runes, [8 CLI commands](/runes/plan/cli), cross-page pipeline |

Each plugin's rune index page (linked from the first column) documents every rune it ships, with worked examples.

## Installing a plugin

```bash
npm install @refrakt-md/marketing @refrakt-md/docs
```

Then either let refrakt auto-discover the package (the default — no further config needed) or declare it explicitly in `refrakt.config.json`:

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "plugins": [
        "@refrakt-md/marketing",
        "@refrakt-md/docs"
      ]
    }
  }
}
```

The adapter loads the packages at build time, merges their rune schemas and theme config into the site's `ThemeConfig`, and makes their tags available in every content file.

## Discovery order

When refrakt builds a site (or the CLI looks up a namespace like `refrakt plan next`), it consults two sources in order:

1. **`plugins` declared in `refrakt.config.json`** — when the field is set (top-level or under any site entry), that list is authoritative. No dependency scanning happens.
2. **`package.json` + `node_modules/@refrakt-md/`** — when no `plugins` field is set anywhere, refrakt scans the project's `dependencies` + `devDependencies` for `@refrakt-md/*` entries (and checks `node_modules/@refrakt-md/` directly to catch workspace-linked packages). Meta packages like `@refrakt-md/cli`, `@refrakt-md/types`, and `@refrakt-md/transform` are excluded — they don't contribute runes or commands.

Either source produces the same result: a list of `DiscoveredPlugin` objects, each tagged with the source that found it.

## Why declare `plugins` explicitly?

For most single-purpose projects you **don't need to declare `plugins`** — auto-discovery picks up every `@refrakt-md/*` package installed in `node_modules`, which covers the common case. Reach for an explicit `plugins` array only when one of these applies:

1. **Determinism.** Dependency scanning is heuristic. If a transitive dep happens to be a refrakt plugin you don't want surfaced, an explicit list filters it out.
2. **Multi-site monorepos.** When two sites in the same repo need different plugin subsets (one uses `@refrakt-md/storytelling`, the other uses `@refrakt-md/business`), declaring per-site keeps each site's content scope clean.
3. **Documentation.** The `plugins` field doubles as a one-glance summary of which extensions a project depends on.

The auto-discovery path is good enough for the refrakt repo itself — no `plugins` field is declared, and the CLI namespaces still work because the packages are installed as workspace dependencies.

## Resolving conflicts

When two plugins define a rune with the same name, refrakt needs to know which one wins. The knobs for that, and for runes that come from the project itself, all live on the `runes` field of a `SiteConfig`:

### `runes.prefer`

When two packages define a rune with the same name, use `prefer` to specify which package wins. Use `"__core__"` to force the built-in core rune to take precedence, and `"__project__"` to let a definition in [`runes.dir`](#runesdir) win over a plugin's rune.

```json
{
  "plugins": ["@my-org/custom", "@refrakt-md/marketing"],
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

### `runes.dir`

The project's own composed runes. Every `<rune>.md` in this directory is a rune named after its file: `runes/quote-card.md` defines `{% quote-card %}`. The directory is relative to the project root (the directory holding `refrakt.config.json`) and defaults to `runes`, so a project can start one without a config edit. `create-refrakt` writes the key anyway.

```json
{
  "runes": {
    "dir": "runes"
  }
}
```

A definition is YAML frontmatter declaring the rune's input and a Markdoc body placing it into existing runes; the file is the same one a plugin ships from its [rune directory](/extend/plugin-authoring/authoring#shipping-composed-runes-from-a-rune-directory).

Three rules apply that a plugin's runes do not share:

- **A project rune can never take a core rune's name or alias.** `{% card %}` meaning something local would break every snippet, page and composition that uses the core one, so the build stops and names both.
- **Taking a plugin rune's name needs a `prefer` entry.** Set `"<name>": "__project__"` to let the project's definition win, or name the plugin to keep its rune.
- **A project definition may not declare `schema`.** Its schema.org row would publish as structured data with nobody reviewing it, and nothing checks a row against schema.org. A plugin's definitions may, because a published package is reviewed like code. The definition is rejected at load, naming the rune.

The directory is read through the project's file provider, so it works in a hosted build with no filesystem. In dev, editing a definition reloads every page that uses it. `refrakt validate` reports a definition that does not build as a finding at its file and line.

### `runes.local`

Load a rune implemented in JavaScript from a local module, for developing a plugin before publishing it. Paths are resolved relative to `refrakt.config.json`.

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

Local runes take highest priority over any installed package rune of the same name. Each entry must be a module exporting a rune with a `transform`. A composed rune definition (`.md`) is rejected here, with a pointer to `runes.dir`.

## Inspecting installed plugins

Two ways to see what refrakt resolved:

```bash
# Human-readable table
npx refrakt plugins list

# Machine-readable — what MCP clients consume
npx refrakt plugins list --format json
```

The output includes the discovery `source` for each plugin (`"config"` or `"dependency-scan"`), so you can confirm the right resolution path is firing.

## Auto-population during migration

The `refrakt config migrate` command auto-populates `site.plugins` from the project's installed `@refrakt-md/*` packages on first migration if the field is absent. Discovery failures are non-blocking — the migration still applies the shape change.

## Want to build your own?

If none of the official plugins cover what you need, you can package custom runes, behaviors, and theme config as your own plugin. See the [Extend handbook](/extend/plugin-authoring/authoring) for a step-by-step guide.
