---
title: Configuration Overview
description: refrakt.config.json — the project-level config that drives content, sites, plan, and plugins.
---

# Configuration Overview

A refrakt project is configured through a single file at the repo root: `refrakt.config.json`. The file is **optional** — planning-only repos can run zero-config and let refrakt autodetect `plan/` from the working directory. Once you create one, it becomes the single source of truth for which sites you publish, where their content lives, which packages you've installed, and where the planning content sits.

## Two recommended shapes

For new projects, write `refrakt.config.json` in one of two shapes:

| Shape | When to use |
|-------|-------------|
| **Singular `site`** | Single-site projects. The `site` field holds a `SiteConfig`. |
| **Plural `sites`** | Multi-site repos (e.g., docs + marketing). `sites` is a name-keyed map of `SiteConfig` entries. |

The singular shape produces `sites.default` after normalization. Multi-site repos must use the plural form. Mixing `site` and `sites` in the same file is rejected.

```json
// Singular — single-site projects
{
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
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
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
  "sites": {
    "main": { "contentDir": "./site/content", "theme": "@refrakt-md/lumina", "target": "svelte" },
    "blog": { "contentDir": "./blog/content", "theme": "@refrakt-md/lumina", "target": "svelte" }
  }
}
```

{% hint type="note" %}
**Legacy flat shape** — projects upgraded from before v0.11.0 may still use a flat top-level shape (`{ "contentDir": "...", "theme": "...", "target": "..." }`). It continues to load, but the loader emits a one-time deprecation warning per process. The flat shape is **deprecated in v0.12.0** and slated for **removal in v1.0**. Run `refrakt config migrate` to upgrade to the nested form before the cutover.
{% /hint %}

## Top-level sections

| Section | Purpose | Required |
|---------|---------|----------|
| `plugins` | Plugins contributing runes, layouts, hooks, CLI commands, and MCP tools | No (auto-discovered if absent) |
| `plan` | Plan-management directory configuration | No |
| `site` / `sites` | Per-site settings | No (planning-only repos can omit) |

Site-scoped fields (`contentDir`, `theme`, `target`, `plugins`, `routeRules`, `icons`, `backgrounds`, `tints`, `runes`, `highlight`, `baseUrl`, `siteName`, `logo`, `defaultImage`, `sandbox`, `overrides`) live inside a site entry. See [Sites](/docs/configuration/sites).

## When you need a config file

You **don't need a config file** if all of these are true:

- Your project is planning-only (`plan/` directory, no site).
- You're happy with the default plan directory (`./plan`).
- You're not using any plugins.

You **do need a config file** when:

- You're publishing a site (at minimum `contentDir`, `theme`, `target`).
- You want to customize the plan directory location.
- You want to declare an explicit plugin list rather than relying on dependency scanning.
- You have multiple sites in one repo.

## Editor support

Reference the published JSON Schema at the top of your config file for autocomplete and inline validation in editors that support it (VS Code, JetBrains, Neovim with `vscode-json-languageserver`):

```json
{
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json"
}
```

The schema URL is versioned per minor release. The unversioned alias (`https://refrakt.md/refrakt.config.schema.json`) always serves the latest schema; pin a specific version for stable validation across upgrades. See [Schema](/docs/configuration/schema) for details.

## Migrating an existing config

If you have a flat-shape config from before v0.11.0, it keeps loading, but the loader emits a once-per-process deprecation warning and the shape is **slated for removal in v1.0**. Migrate to the nested form with `refrakt config migrate`:

```bash
# Preview the migration
npx refrakt config migrate

# Write the changes
npx refrakt config migrate --apply
```

See [Migration](/docs/configuration/migration).
