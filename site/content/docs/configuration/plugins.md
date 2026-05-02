---
title: Plugins
description: How refrakt discovers plugins and how `config.plugins` overrides dependency scanning.
---

# Plugins

A **plugin** is a package that contributes CLI commands and MCP tools by exporting a `cli-plugin` entry point. The most common one is `@refrakt-md/plan`, which adds the `refrakt plan ...` command set.

## Discovery order

When the refrakt CLI looks up a namespace (e.g., `refrakt plan next`), it consults two sources in order:

1. **`config.plugins`** — when `refrakt.config.json` declares a `plugins` array, that list is authoritative. No dependency scanning happens.
2. **`package.json` + `node_modules/@refrakt-md/`** — when no `plugins` field is set, refrakt scans the project's `dependencies` + `devDependencies` for `@refrakt-md/*` entries (also checking `node_modules/@refrakt-md/` directly to catch workspace-linked packages). Meta packages like `@refrakt-md/cli`, `@refrakt-md/types`, `@refrakt-md/transform` are excluded — they don't ship CLI commands.

Either source produces the same kind of result: a list of `DiscoveredPlugin` objects, each tagged with the source that found it.

## Declaring `plugins`

```json
{
  "plugins": [
    "@refrakt-md/plan",
    "@my-org/custom-plan-extension"
  ]
}
```

When set:

- The CLI dispatches `refrakt <namespace>` to one of these packages.
- The MCP server (`@refrakt-md/mcp`) registers each plugin's commands as tools under `<namespace>.<name>`.
- The list is unambiguous — transitive deps and runes-only packages don't accidentally show up.

## Why declare it explicitly?

For most single-purpose projects you **don't need to declare `plugins`** — auto-discovery picks up every `@refrakt-md/*` package installed in `node_modules` that ships a `cli-plugin` export, which covers the common case. Reach for an explicit `plugins` array only when one of these applies:

1. **Determinism.** Dependency scanning is heuristic. If a transitive dep happens to be a refrakt plugin you don't want surfaced, an explicit list filters it out.
2. **Multi-context monorepos.** When one workspace uses `@refrakt-md/plan` and another doesn't, declaring per-project keeps each one's CLI namespace clean.
3. **Documentation.** The `plugins` field doubles as a one-glance summary of which namespaces your project's CLI is meant to support.

The auto-discovery path is good enough for the refrakt repo itself — no `plugins` field declared, and `refrakt plan ...` still works because the package is installed.

## Difference from `site.packages`

`config.plugins` and `site(s).<name>.packages` are **separate** fields with separate purposes:

| Field | Purpose |
|-------|---------|
| `plugins` (top-level) | Packages contributing CLI commands and MCP tools |
| `site.packages` (per-site) | Rune packages merged into a site's `ThemeConfig` for content rendering |

Most packages appear in both — `@refrakt-md/plan` registers CLI commands and rune schemas. But the split lets a CLI-only plugin (no runes) skip site merging, and lets two sites in the same repo merge different package subsets.

```json
{
  "plugins": ["@refrakt-md/plan"],
  "sites": {
    "main": {
      "contentDir": "./content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "packages": ["@refrakt-md/marketing", "@refrakt-md/docs", "@refrakt-md/plan"]
    }
  }
}
```

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

The `refrakt config migrate` command auto-populates `plugins` from the project's installed `@refrakt-md/*` packages on first migration if the field is absent. Discovery failures are non-blocking — the migration still applies the shape change.
