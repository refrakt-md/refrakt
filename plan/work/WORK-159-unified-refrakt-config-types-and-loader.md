{% work id="WORK-159" status="done" priority="high" complexity="moderate" tags="config, types, cli, foundation" source="ADR-010" milestone="v0.11.0" %}

# Unified RefraktConfig types, loader, and JSON Schema

Promote `refrakt.config.json` from a site-only file into the unified root config defined in ADR-010. Add type-level support for `plugins`, `plan`, `site`, and `sites`, normalize the three valid input shapes (flat / singular `site` / plural `sites`) into a canonical internal form, and publish a JSON Schema so editors can autocomplete and validate the file.

## Acceptance Criteria

- [ ] `RefraktConfig` in `@refrakt-md/types` gains optional `plugins: string[]`, `plan: PlanConfig`, `site: SiteConfig`, and `sites: Record<string, SiteConfig>` fields
- [x] Existing flat fields (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`, `siteName`, `logo`, `baseUrl`) stay on the type and are JSDoc-marked as deprecated shorthand for `sites.default.*`
- [x] Normalization lives in `@refrakt-md/transform/node` (the shared loader used by Astro / Nuxt / Next / Eleventy adapters); `loadRefraktConfig()` in that package returns a normalized config where `sites` is always populated (flat shape and singular `site` collapse to `sites.default`)
- [x] `loadRefraktConfigFile()` in `packages/cli/src/config-file.ts` is rewritten as a thin delegation to the transform/node loader so the CLI and adapters share one source of truth
- [x] Both loaders expose the original raw input alongside the normalized form (for the migration command and any tool that needs to round-trip)
- [x] Loader rejects files that declare both `site` and `sites` with a clear error message
- [x] Loader accepts a planning-only config (`{ "plan": { "dir": "plan" } }`) without complaint
- [x] `refrakt.config.schema.json` is published at the repo root and referenced from the package's `files` array; covers all three shapes and the `plugins`/`plan`/`site`/`sites` sections
- [x] Tests cover: flat shape, singular `site`, plural `sites`, plan-only, plan + sites, mutually-exclusive error, missing file fallback — exercised against both the transform/node loader and the CLI delegate
- [x] All existing call sites of `loadRefraktConfig` (in adapters) and `loadRefraktConfigFile` (in CLI) continue to work without changes (backwards-compatible normalization)

## Approach

1. Extend `packages/types/src/` with `PlanConfig` and `SiteConfig` interfaces, then update `RefraktConfig` to include the new fields. Keep the flat fields for backwards compatibility but mark them `@deprecated`.

2. Add a `normalizeRefraktConfig(raw: RawRefraktConfig): NormalizedRefraktConfig` helper in `@refrakt-md/transform/node` (alongside the existing `loadRefraktConfig`). The normalized shape always has `sites: Record<string, SiteConfig>` populated; flat-shape files produce `{ default: { contentDir, theme, target, packages, routeRules, icons, … } }`.

3. Update `loadRefraktConfig` in transform/node to call the normalizer and return `{ normalized, raw }`. Existing consumers reading the flat shape continue to work because the normalized form preserves backwards-compatible accessors (or they get migrated as part of WORK-166's adapter updates).

4. Update `loadRefraktConfigFile` in `packages/cli/src/config-file.ts` to import and delegate to the transform/node loader rather than parsing on its own.

5. Author the JSON Schema by hand from the TypeScript types; it does not need to be auto-generated for v1. Use `oneOf` to express the singular-vs-plural exclusivity.

6. Add a `$schema` reference at the top of `site/refrakt.config.json` after WORK-172 lands so editors pick it up automatically.

## Dependencies

- None. This is the foundation other items in v0.11.0 build on.

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `packages/transform/src/node.ts` (or wherever `loadRefraktConfig` lives) — shared loader for adapters
- `packages/cli/src/config-file.ts` — CLI loader to delegate
- `packages/types/src/` — where `RefraktConfig` lives
- `packages/astro/src/integration.ts`, `packages/nuxt/src/module.ts` — current adapter consumers of `loadRefraktConfig`
- `site/refrakt.config.json` — current flat-shape example

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/types/src/theme.ts` — Added `SiteConfig` and `PlanConfig` interfaces. Extended `RefraktConfig` with optional `plugins`, `plan`, `site`, and `sites` fields. Marked the legacy flat-shape fields (`contentDir`, `theme`, `target`, …) as `@deprecated` JSDoc, keeping `contentDir`/`theme`/`target` as required strings so existing adapter code keeps compiling — the normalizer guarantees they're populated for single-site configs.
- `packages/types/src/index.ts` — Exported the new `SiteConfig` and `PlanConfig` types.
- `packages/transform/src/config-normalize.ts` (new) — `normalizeRefraktConfig(raw)` collapses flat / singular-`site` / plural-`sites` shapes into a canonical form where `sites` is always populated. Mirrors the lone site's fields to the top level for single-site configs (backwards compat). Rejects `site` + `sites` mutually exclusive. Also exports `resolveSite()` and `resolvePlanConfig()` helpers used by WORK-164 and WORK-168.
- `packages/transform/src/adapter-node.ts` — `loadRefraktConfig()` now returns the normalized form. New `loadRefraktConfigWithRaw()` returns both raw and normalized for tools that need to round-trip the original shape (the migration command from WORK-171). Re-exports the normalizer helpers.
- `packages/cli/src/config-file.ts` — `loadRefraktConfigFile()` is now a thin delegate to `loadRefraktConfigWithRaw()`. Returns `{ path, config: normalized, raw }`. The CLI and framework adapters now share one normalization path.
- `packages/transform/refrakt.config.schema.json` (new) + `refrakt.config.schema.json` symlink at repo root — JSON Schema covering all three input shapes with `oneOf` for site/sites exclusivity and `$defs` for `SiteConfig`, `PlanConfig`, `RouteRule`, `HighlightConfig`, `RunesConfig`. Listed in transform's `files` array for npm publication.
- `packages/transform/test/config-normalize.test.ts` (new) — 20 tests covering flat shape, singular site, plural sites, plan-only, plan+sites, mutually-exclusive error, non-object input rejection, `resolveSite` happy paths plus error variants (multi-site without name, unknown name with did-you-mean, plan-only repo), `resolvePlanConfig` defaults and overrides.

### Notes

- `SITE_FIELDS` in the normalizer is the authoritative list of fields that mirror between top-level and `sites.default` for backwards compatibility. Adding new site-scoped fields requires updating this constant.
- For single-site configs the normalizer preserves the input's top-level field values as-is (mirroring sites→top-level and top-level→site to populate the gaps). Adapters that read `config.contentDir` keep working unchanged. Multi-site updates land in WORK-166.
- Skipped exposing `plan.specsDir` per the refinement in the prior PR — `plan.dir` is the only configurable plan path for v0.11.0.
- Levenshtein-based did-you-mean lives in the normalizer module since `resolveSite()` needs it; the CLI dispatch refactor (WORK-162) and `--site` flag (WORK-164) will reuse it via the same export path.
- All 2240 existing tests still pass.

{% /work %}
