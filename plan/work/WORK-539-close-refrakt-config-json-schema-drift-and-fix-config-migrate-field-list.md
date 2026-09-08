{% work id="WORK-539" status="done" priority="high" complexity="moderate" source="" tags="config,schema,docs" milestone="v0.32.0" %}

# Close refrakt.config.json schema drift and fix config migrate field list

`packages/transform/refrakt.config.schema.json` is hand-maintained and had drifted from the `RefraktConfig` / `SiteConfig` interfaces in `@refrakt-md/types`. Nothing guarded it, so seven discrepancies had accumulated — fields that exist in the types but are absent from the schema (and therefore missing from editor autocomplete *and* from the configuration docs), one field the schema advertised that the types no longer have, and two nested objects the schema actively rejected.

Separately, `refrakt config migrate` kept its own hand-copied `SITE_FIELDS` array, which had drifted from the authoritative one in `config-normalize.ts`. The two lists describe inverse operations over the same field set — the normalizer mirrors site → top level, the migration moves top level → site — so a divergence strands fields.

## Context

Found while auditing the content-author documentation surface. The configuration docs only covered a subset of the available options; the root cause turned out to be that no single source of truth was enforced across the types, the published schema, the migration command, and the docs.

Schema gaps closed:

| Field | Problem |
|-------|---------|
| `xrefs` (top level) | Missing entirely — documented only on `/runes/xref` |
| `fileRoots` (top level) | Missing entirely — documented only in rune-authoring/partials |
| `SiteConfig.entityRoutes` | Missing entirely — documented only in plugin-authoring/pipeline |
| `SiteConfig.locale` | Missing entirely — documented only in extend/i18n |
| `SiteConfig.strings` | Missing entirely — documented only in extend/i18n |
| `RouteRule.entity` | Missing, and `additionalProperties: false` made it a hard validation error |
| `sandbox.dir` | Only the deprecated `examplesDir` was allowed; the current name was rejected |
| `tints` (top level) | Advertised by the schema but dropped from `RefraktConfig` in SPEC-053 — autocompleted a field that is silently ignored at runtime |

`refrakt config migrate` gaps closed: `search`, `repoUrl`, and `repoBranch` were left at the top level instead of moving into `site`; `tints` was moved when the normalizer deliberately excludes it.

## Acceptance Criteria
- [x] Every `RefraktConfig`, `SiteConfig`, `EntityRoute`, `XrefPattern`, `RouteRule`, and `PlanConfig` field is described by the JSON Schema
- [x] The schema declares no property the interfaces do not have
- [x] A drift test reads the interfaces from `@refrakt-md/types` and fails when the schema falls behind
- [x] `refrakt config migrate` and the config normalizer share one `SITE_FIELDS` definition
- [x] A regression test covers the stranded-field bug in `refrakt config migrate`
- [x] The configuration docs list the complete top-level and site-scoped field sets
- [x] `docs/configuration/schema.md` no longer makes claims about coverage that are untrue

## Approach

Derive the drift test from the TypeScript source rather than mirroring the field list in a literal — a hardcoded mirror only catches drift if someone remembers to update it. The test reads `packages/types/src/theme.ts`, extracts each interface's top-level members, and asserts coverage in both directions.

Export `SITE_FIELDS` from `@refrakt-md/transform/node` and have the CLI import it, rather than patching the CLI's copy. The normalizer's list is already type-checked with `satisfies readonly (keyof SiteConfig)[]`, so sharing it means a new site field can't silently break either direction.

## References

Follow-up work, deliberately out of scope here:

- `create-refrakt` scaffolds `$schema: https://refrakt.md/schemas/v{major}.{minor}/refrakt.config.schema.json` derived from its own version (currently v0.31), but `site/src/routes/schemas/` only serves `v0.11` — every scaffolded project points at a 404. There is no route for `theme-tokens.json` at any version, though `getThemeTokensSchemaUrl()` scaffolds one. Needs a versioned-route policy decision (catch-all vs. per-release directory) plus a release-process step.
- The schema's own `$id` still declares `v0.11` while the package ships 0.31.0.

## Resolution

Completed: 2026-09-08

Branch: `claude/content-author-docs-org-vps1un`

### What was done

- **`packages/transform/refrakt.config.schema.json`** — added the project-level `xrefs` and `fileRoots`; added `entityRoutes`, `locale`, and `strings` to `SiteConfig`; added new `EntityRoute`, `XrefPattern`, and `SandboxConfig` definitions; added `entity` to `RouteRule`; removed the dead top-level `tints`. The `sandbox` block now accepts the current `dir` alongside the deprecated `examplesDir` — previously `additionalProperties: false` made the correct spelling a validation error.
- **`packages/transform/test/config-schema.test.ts`** (new, 18 tests) — the drift guard. Extracts each interface's top-level members from `packages/types/src/theme.ts` and asserts bidirectional coverage against the schema, plus round-trip validation of the new fields and the `render`/`render-template` mutual exclusion. Verified it fails on an injected field before relying on it.
- **`packages/transform/src/config-normalize.ts` / `adapter-node.ts`** — exported `SITE_FIELDS` as the canonical legacy-shorthand set.
- **`packages/cli/src/commands/config.ts`** — dropped the drifted hand copy of `SITE_FIELDS` in favour of the shared export, fixing `refrakt config migrate` leaving `search` / `repoUrl` / `repoBranch` at the top level and moving `tints` when the normalizer excludes it.
- **`packages/cli/test/config-migrate.test.ts`** — regression test for the stranded fields; confirmed it fails against the old list.
- **Docs** — `configuration/overview.md` gains the two missing top-level rows plus worked examples for `xrefs` and `fileRoots`, and a complete site-scoped field list; `configuration/sites.md` gains `entityRoutes`, a Localization section for `locale`/`strings`, the `routeRules.entity` field, and a correction to `target` (it was marked required when it is optional and documentation-only); `configuration/schema.md`'s "What the schema covers" claims are now accurate.

### Notes

- The drift test reads the TypeScript source rather than mirroring the field list, because a hardcoded mirror only catches drift when someone remembers to update it. The extractor found `RouteRule.entity` and the dead top-level `tints` on its own — two of the eight discrepancies were not in the original hand audit.
- Removing top-level `tints` cannot invalidate an existing config: the top level does not set `additionalProperties: false`.
- Full suite: 4174/4176 passing. The two failures are 5s timeouts in `plugins/plan/test/pipeline.test.ts` and `packages/content/test/plan-site-dogfood-real.test.ts` under parallel load; both pass in isolation and neither touches this change.
- Two follow-ups recorded under `## References` and deliberately left out of scope: scaffolded projects reference `schemas/v0.31/` while the site only serves `v0.11` (so every scaffolded `$schema` 404s, and `theme-tokens.json` has no route at all), and the schema's own `$id` still says v0.11.

{% /work %}
