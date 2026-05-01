{% work id="WORK-159" status="draft" priority="high" complexity="moderate" tags="config, types, cli, foundation" source="ADR-010" milestone="v0.11.0" %}

# Unified RefraktConfig types, loader, and JSON Schema

Promote `refrakt.config.json` from a site-only file into the unified root config defined in ADR-010. Add type-level support for `plugins`, `plan`, `site`, and `sites`, normalize the three valid input shapes (flat / singular `site` / plural `sites`) into a canonical internal form, and publish a JSON Schema so editors can autocomplete and validate the file.

## Acceptance Criteria

- [ ] `RefraktConfig` in `@refrakt-md/types` gains optional `plugins: string[]`, `plan: PlanConfig`, `site: SiteConfig`, and `sites: Record<string, SiteConfig>` fields
- [ ] Existing flat fields (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`, `siteName`, `logo`, `baseUrl`) stay on the type and are JSDoc-marked as deprecated shorthand for `sites.default.*`
- [ ] `loadRefraktConfigFile()` in `packages/cli/src/config-file.ts` returns a normalized config where `sites` is always populated (flat shape and singular `site` collapse to `sites.default`); the original input is exposed separately for tooling that needs to round-trip
- [ ] Loader rejects files that declare both `site` and `sites` with a clear error message
- [ ] Loader accepts a planning-only config (`{ "plan": { "dir": "plan" } }`) without complaint
- [ ] `refrakt.config.schema.json` is published at the repo root and referenced from the package's `files` array; covers all three shapes and the `plugins`/`plan`/`site`/`sites` sections
- [ ] Tests in `packages/cli/test/` cover: flat shape, singular `site`, plural `sites`, plan-only, plan + sites, mutually-exclusive error, missing file fallback
- [ ] All existing call sites of `loadRefraktConfigFile` continue to work without changes (backwards-compatible normalization)

## Approach

1. Extend `packages/types/src/` with `PlanConfig` and `SiteConfig` interfaces, then update `RefraktConfig` to include the new fields. Keep the flat fields for backwards compatibility but mark them `@deprecated`.

2. Add a `normalizeRefraktConfig(raw: RawRefraktConfig): NormalizedRefraktConfig` helper. The normalized shape always has `sites: Record<string, SiteConfig>` populated; flat-shape files produce `{ default: { contentDir, theme, target, packages, routeRules, icons, … } }`.

3. Update `loadRefraktConfigFile` to call the normalizer. Add a second return field (`raw`) for tools (like the migration command) that need the original shape.

4. Author the JSON Schema by hand from the TypeScript types; it does not need to be auto-generated for v1. Use `oneOf` to express the singular-vs-plural exclusivity.

5. Add a `$schema` reference at the top of `site/refrakt.config.json` after WORK-172 lands so editors pick it up automatically.

## Dependencies

- None. This is the foundation other items in v0.11.0 build on.

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `packages/cli/src/config-file.ts` — current loader to extend
- `packages/types/src/` — where `RefraktConfig` lives
- `site/refrakt.config.json` — current flat-shape example

{% /work %}
