---
'@refrakt-md/transform': patch
'@refrakt-md/cli': patch
---

Close the drift between `refrakt.config.json`'s JSON Schema and the config types, and fix `refrakt config migrate` stranding site fields

The published schema is hand-maintained and nothing guarded it against the `RefraktConfig` / `SiteConfig` interfaces, so it had fallen behind in both directions. Editors validating against it were missing autocomplete for real fields, and rejecting two that are valid:

- **Absent from the schema entirely** — the project-level `xrefs` and `fileRoots`, and the site-level `entityRoutes`, `locale`, and `strings`.
- **Actively rejected** — `sandbox.dir` (only the deprecated `examplesDir` alias was allowed, so the current spelling errored) and `routeRules[].entity`, which combined with `additionalProperties: false` made SPEC-092's convention-based entity typing a validation failure.
- **Advertised but dead** — a top-level `tints`, dropped from `RefraktConfig` in SPEC-053. The normalizer deliberately refuses to mirror it, so a value written there is silently ignored at runtime.

`packages/transform/test/config-schema.test.ts` now guards this. Rather than mirroring the field list in a literal — which only catches drift if someone remembers to update it — it reads the interfaces out of `@refrakt-md/types` and asserts coverage in both directions, so a field added to `SiteConfig` fails until the schema describes it.

**`refrakt config migrate` fix.** The command kept its own hand-copied `SITE_FIELDS` array, which had drifted from the authoritative one in `config-normalize.ts`. The two describe inverse operations over the same set — the normalizer mirrors site → top level, the migration moves top level → site — so the divergence left `search`, `repoUrl`, and `repoBranch` behind at the top level of a migrated config, where nothing reads them once the file is in nested shape. It also moved `tints`, which the normalizer excludes on purpose. `SITE_FIELDS` is now exported from `@refrakt-md/transform/node` and consumed by the CLI, so both directions stay in step; the list is already type-checked with `satisfies readonly (keyof SiteConfig)[]`.

No runtime behaviour changes for configs that were already valid — the schema is used for editor validation, and the top-level `tints` removal can't invalidate an existing file because the top level does not set `additionalProperties: false`.
