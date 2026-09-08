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

The schema is published at two URL forms:

| URL | Purpose |
|-----|---------|
| `https://refrakt.md/schemas/vX.Y/refrakt.config.schema.json` | **Versioned** — frozen for that minor release line. Pin one version per project for stable validation. |
| `https://refrakt.md/refrakt.config.schema.json` | **Latest alias** — always serves the most recently published schema. Tracks current main; may add fields between releases. |

The schema is versioned alongside `@refrakt-md/transform`. New fields can land in any minor release, so the unversioned URL may show false errors on a project pinned to an older refrakt version once the schema gains fields you don't have. The versioned URL avoids that drift.

### Which one should I reference?

- **Pin to a version** (`schemas/v0.11/...`) when you want validation that matches the refrakt version your project depends on. Bump the URL when you upgrade refrakt. `create-refrakt` scaffolds the URL for the version it was released with, so new projects start in this mode by default.
- **Use the unversioned alias** (`refrakt.config.schema.json`) when you're tracking the latest refrakt release and want validation to follow along automatically.

Both URLs serve identical content today; the difference shows up across releases.

### Schema's own `$id`

The schema body declares its canonical identity via `$id`, which always points at the versioned URL for the release that published it (currently `https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`). Editors that key off `$id` rather than fetch URL still resolve definitions correctly when you reference the unversioned alias.
