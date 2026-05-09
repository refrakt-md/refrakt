---
title: Plugins
description: How refrakt discovers plugins and how `plugins` arrays in config override dependency scanning.
---

# Plugins

A **plugin** is an npm package that extends refrakt. A single plugin can contribute any combination of:

- **Runes** — Markdoc tags that reinterpret Markdown content
- **Layouts** — page templates and structural conventions
- **Theme config** — BEM blocks, icons, background presets, design tokens
- **Pipeline hooks** — cross-page registration, aggregation, and post-processing
- **Behaviors** — progressive-enhancement JS for interactive runes
- **CLI commands and MCP tools** — via a `cli-plugin` entry point

The official `@refrakt-md/marketing` plugin contributes runes and theme config. `@refrakt-md/plan` contributes runes *and* CLI commands. There is no separate "rune package" vs. "CLI plugin" split — a plugin is a plugin.

## Discovery order

When the refrakt CLI looks up a namespace (e.g., `refrakt plan next`), it consults two sources in order:

1. **`plugins` declared in `refrakt.config.json`** — when set (top-level or under any site), that list is authoritative. No dependency scanning happens.
2. **`package.json` + `node_modules/@refrakt-md/`** — when no `plugins` field is set anywhere, refrakt scans the project's `dependencies` + `devDependencies` for `@refrakt-md/*` entries (also checking `node_modules/@refrakt-md/` directly to catch workspace-linked packages). Meta packages like `@refrakt-md/cli`, `@refrakt-md/types`, `@refrakt-md/transform` are excluded — they don't contribute commands.

Either source produces the same kind of result: a list of `DiscoveredPlugin` objects, each tagged with the source that found it.

## Declaring `plugins`

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "plugins": ["@refrakt-md/marketing", "@refrakt-md/docs", "@refrakt-md/plan"]
    }
  }
}
```

When set:

- The site's content pipeline merges each plugin's runes, layouts, theme config, and hooks into the site's `ThemeConfig`.
- The CLI dispatches `refrakt <namespace>` to any plugin in the union of all sites' lists that ships a `cli-plugin` export.
- The MCP server (`@refrakt-md/mcp`) registers each plugin's commands as tools under `<namespace>.<name>`.
- The list is unambiguous — transitive deps don't accidentally show up.

The flat (legacy) shape supports `plugins` at the top level; the normalizer mirrors it into `sites.main.plugins`.

## Why declare `plugins` explicitly?

For most single-purpose projects you **don't need to declare `plugins`** — auto-discovery picks up every `@refrakt-md/*` package installed in `node_modules`, which covers the common case. Reach for an explicit `plugins` array only when one of these applies:

1. **Determinism.** Dependency scanning is heuristic. If a transitive dep happens to be a refrakt plugin you don't want surfaced, an explicit list filters it out.
2. **Multi-site monorepos.** When two sites in the same repo need different plugin subsets (one site uses `@refrakt-md/storytelling`, the other uses `@refrakt-md/business`), declaring per-site keeps each site's content scope clean.
3. **Documentation.** The `plugins` field doubles as a one-glance summary of which extensions a project depends on.

The auto-discovery path is good enough for the refrakt repo itself — no `plugins` field declared, and the CLI namespaces still work because the packages are installed.

## Inspecting installed plugins

Two ways to see what refrakt sees:

```bash
# Human-readable table
npx refrakt plugins list

# Machine-readable — what MCP clients consume
npx refrakt plugins list --format json
```

The output includes the discovery `source` for each plugin (`"config"` or `"dependency-scan"`), so you can confirm the right resolution path is firing.

## Auto-population during migration

The `refrakt config migrate` command auto-populates `site.plugins` from the project's installed `@refrakt-md/*` packages on first migration if the field is absent. Discovery failures are non-blocking — the migration still applies the shape change.
