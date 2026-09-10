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

A config file has two scopes: a handful of fields at the root, and everything else inside a site entry. Both are listed in the **[configuration reference](/docs/configuration/reference)** — the root ones under *Top-level*, the rest grouped by what they do.

The root holds what is not per-site: `plugins`, `plan`, `xrefs` and `fileRoots`, plus the `site` / `sites` entry itself. See [Sites](/docs/configuration/sites) for how a site entry is shaped.

{% hint type="note" %}
The reference is generated from the [JSON Schema](/docs/configuration/schema), which is itself drift-tested against the TypeScript interfaces — so the page, your editor's autocomplete and the code cannot disagree.
{% /hint %}

### `xrefs` — URL templates for external references

`{% xref %}` and `{% ref %}` resolve IDs against the entity registry first. `xrefs` catches the ones that aren't registry entities — issue numbers, RFCs, ticket IDs — by matching the ID against a regex and building a URL from it. Patterns are tried in order; first match wins.

```json
{
  "xrefs": [
    {
      "match": "^GH-(?<num>\\d+)$",
      "template": "https://github.com/owner/repo/issues/{num}",
      "type": "github-issue",
      "label": "GitHub #{num}"
    }
  ]
}
```

`match` is anchored to a whole-string match automatically. Named groups are available as `{name}` in both `template` and `label`; `{id}` is the full matched ID. See [`xref`](/runes/xref) for the authoring side.

### `fileRoots` — named directories for file-reading runes

Maps a namespace to a directory, letting runes that read files off disk address them as `namespace:filename` instead of by relative path. Values are relative to the project root and must point at directories that exist. The namespace `site` is reserved.

```json
{
  "fileRoots": {
    "shared": "./content/_shared",
    "templates": "./content/_templates"
  }
}
```

`{% partial file="shared:footer.md" /%}` then resolves regardless of which page includes it. `entityRoutes`' `render-template` uses the same resolver. See [Partials](/docs/authoring/partials#namespaced-partials-via-file-roots).

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
