---
title: Configuration Overview
description: refrakt.config.json — the project-level config that drives content, sites, plan, and plugins.
---

# Configuration Overview

A refrakt project is configured through a single file at the repo root: `refrakt.config.json`. The file is **optional** — planning-only repos can run zero-config and let refrakt autodetect `plan/` from the working directory. Once you create one, it becomes the single source of truth for which sites you publish, where their content lives, which packages you've installed, and where the planning content sits.

## Three valid shapes

`refrakt.config.json` accepts three input shapes that all collapse to the same canonical form internally:

| Shape | When to use |
|-------|-------------|
| **Flat** *(legacy)* | Single-site projects upgraded from before v0.11.0. Everything lives at the top level. |
| **Singular `site`** | New single-site projects. The `site` field holds a `SiteConfig`. |
| **Plural `sites`** | Multi-site repos (e.g., docs + marketing). `sites` is a name-keyed map of `SiteConfig` entries. |

The flat shape and singular `site` are equivalent — both produce `sites.default` after normalization. Multi-site repos must use the plural form. Mixing `site` and `sites` in the same file is rejected.

```json
// Flat (legacy) — still valid; kept for backwards compatibility
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte"
}
```

```json
// Singular — recommended for new single-site projects
{
  "$schema": "https://refrakt.md/refrakt.config.schema.json",
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte"
  }
}
```

```json
// Plural — multi-site
{
  "$schema": "https://refrakt.md/refrakt.config.schema.json",
  "sites": {
    "main": { "contentDir": "./site/content", "theme": "@refrakt-md/lumina", "target": "svelte" },
    "blog": { "contentDir": "./blog/content", "theme": "@refrakt-md/lumina", "target": "svelte" }
  }
}
```

## Top-level sections

| Section | Purpose | Required |
|---------|---------|----------|
| `plugins` | Packages contributing CLI commands and MCP tools | No (auto-discovered if absent) |
| `plan` | Plan-management directory configuration | No |
| `site` / `sites` | Per-site settings | No (planning-only repos can omit) |

Site-scoped fields (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`, `tints`, `runes`, `highlight`, `baseUrl`, `siteName`, `logo`, `defaultImage`, `sandbox`, `overrides`) live inside a site entry. See [Sites](/docs/configuration/sites).

## When you need a config file

You **don't need a config file** if all of these are true:

- Your project is planning-only (`plan/` directory, no site).
- You're happy with the default plan directory (`./plan`).
- You're not using any community plugin packages.

You **do need a config file** when:

- You're publishing a site (at minimum `contentDir`, `theme`, `target`).
- You want to customize the plan directory location.
- You want to declare an explicit plugin list rather than relying on dependency scanning.
- You have multiple sites in one repo.

## Editor support

Reference the published JSON Schema at the top of your config file for autocomplete and inline validation in editors that support it (VS Code, JetBrains, Neovim with `vscode-json-languageserver`):

```json
{
  "$schema": "https://refrakt.md/refrakt.config.schema.json"
}
```

See [Schema](/docs/configuration/schema) for details.

## Migrating an existing config

If you have a flat-shape config from before v0.11.0, it keeps working — the loader preserves backwards compatibility indefinitely. When you're ready to move to the nested form (or add a second site), use `refrakt config migrate`:

```bash
# Preview the migration
npx refrakt config migrate

# Write the changes
npx refrakt config migrate --apply
```

See [Migration](/docs/configuration/migration).
