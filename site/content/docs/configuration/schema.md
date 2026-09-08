---
title: Schema
description: The published JSON Schema for refrakt.config.json — editor autocomplete and validation.
---

# Schema

refrakt publishes a JSON Schema describing every valid `refrakt.config.json` shape. Reference it from your config file to get autocomplete, hover docs, and inline validation in modern editors.

## Adding the `$schema` reference

```json
{
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
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

- **All three shapes** — flat (legacy, deprecated in v0.12), singular `site`, plural `sites` — with `oneOf` enforcing mutual exclusivity between `site` and `sites`.
- **Top-level sections** — `plugins`, `plan`, `xrefs`, `fileRoots`, `site`/`sites`, plus the deprecated flat-shape shorthands.
- **`SiteConfig` definition** — every site-scoped field with its type, description, and required-ness.
- **`PlanConfig` definition** — `plan.dir`.
- **Helper definitions** — `RouteRule`, `EntityRoute`, `XrefPattern`, `SandboxConfig`, `HighlightConfig`, `SiteThemeConfig`, `RunesConfig`.

{% hint type="note" %}
The schema is hand-maintained, but it doesn't drift: `packages/transform/test/config-schema.test.ts` reads the `RefraktConfig`, `SiteConfig`, `EntityRoute`, `XrefPattern`, `RouteRule`, and `PlanConfig` interfaces out of `@refrakt-md/types` and fails if the schema is missing a field — or describes one the types don't have.
{% /hint %}

## Local-development reference

When working inside the refrakt monorepo itself, the root `refrakt.config.json` references the schema via the relative-path symlink. New projects scaffolded with `create-refrakt` reference the published URL. Both forms are valid; pick whichever your editor's filesystem watch handles best.

## Versioning

Both schemas are published at two URL forms:

| URL | Purpose |
|-----|---------|
| `https://refrakt.md/schemas/vX.Y/refrakt.config.schema.json` | **Versioned** — a stable URL per minor release line. `create-refrakt` scaffolds this form. |
| `https://refrakt.md/refrakt.config.schema.json` | **Latest alias** — the most recently published schema. |

The theme-token schema is published the same way, at `https://refrakt.md/schemas/vX.Y/theme-tokens.json` and `https://refrakt.md/schemas/theme-tokens.json`.

Every version from `v0.11` (the first release to publish a versioned URL) through the current release resolves. The route is generated from the version `@refrakt-md/transform` ships, so each release publishes its own URL as a side effect of building the site — see `site/src/lib/schema-versions.ts`.

{% hint type="note" %}
**Versioned URLs are stable addresses, not frozen snapshots.** Every version currently serves the same, latest schema body — refrakt does not archive per-release copies. In practice this is benign: schema changes are additive, so a newer schema validating an older config yields no false errors. It does mean a pinned URL won't warn you about a field your installed version doesn't support yet.
{% /hint %}

### Which one should I reference?

- **Pin to a version** (`schemas/v0.31/...`) when you want a URL that keeps meaning the same thing as refrakt evolves. Bump it when you upgrade. `create-refrakt` scaffolds the URL for the version it was released with, so new projects start in this mode by default.
- **Use the unversioned alias** when you're tracking the latest release and want validation to follow along automatically.

### Schema's own `$id`

Each versioned endpoint stamps `$id` to match its own URL, so a schema fetched from `schemas/v0.31/refrakt.config.schema.json` identifies itself as exactly that. The unversioned alias stamps the concrete version it is currently serving, so an editor keying off `$id` rather than the fetch URL can still tell which release it got.

The copy bundled inside `@refrakt-md/transform` carries the unversioned `$id` instead — an identity that stays correct without a per-release edit.
