---
title: Schema
description: The published JSON Schema for refrakt.config.json — editor autocomplete and validation.
---

# Schema

refrakt publishes a JSON Schema describing every valid `refrakt.config.json` shape. Reference it from your config file to get autocomplete, hover docs, and inline validation in modern editors.

## Adding the `$schema` reference

```json
{
  "$schema": "https://refrakt.md/refrakt.config.schema.json",
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte"
  }
}
```

The schema URL is the canonical location served from the docs site. Editors that handle `$schema` references (VS Code, JetBrains IDEs, Neovim with `vscode-json-languageserver`) fetch it once and provide:

- Autocomplete for known fields (e.g., `target` enum values).
- Hover documentation pulled from the schema's `description` fields.
- Inline error markers when a field is missing or has the wrong type.
- Detection of the `site` vs `sites` mutual-exclusivity rule (`oneOf` constraint).

## Schema source of truth

The schema ships with `@refrakt-md/transform`. The published file at `https://refrakt.md/refrakt.config.schema.json` mirrors the one bundled with the package:

```
packages/transform/refrakt.config.schema.json
```

A symlink at the repo root (`refrakt.config.schema.json` → `packages/transform/refrakt.config.schema.json`) lets in-repo configs reference the schema by relative path during development:

```json
{
  "$schema": "./refrakt.config.schema.json"
}
```

## What the schema covers

- **All three shapes** — flat, singular `site`, plural `sites` — with `oneOf` enforcing mutual exclusivity between `site` and `sites`.
- **Top-level sections** — `plugins`, `plan`, `site`/`sites`.
- **`SiteConfig` definition** — every site-scoped field with its type, description, and required-ness.
- **`PlanConfig` definition** — `plan.dir`.
- **Helper definitions** — `RouteRule`, `HighlightConfig`, `RunesConfig`.

## Local-development reference

When working inside the refrakt monorepo itself, the root `refrakt.config.json` references the schema via the relative-path symlink. New projects scaffolded with `create-refrakt` reference the published URL. Both forms are valid; pick whichever your editor's filesystem watch handles best.

## Versioning

The schema is versioned alongside `@refrakt-md/transform`. Major-version bumps may add new fields or rename existing ones; the published URL always serves the latest. Pin a specific version via npm if you want stable validation behavior across upgrades.
