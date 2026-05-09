{% work id="WORK-176" status="done" priority="medium" complexity="moderate" tags="config, schema, types, docs" source="ADR-010" milestone="v0.12.0" %}

# v0.11.0 config follow-ups

A handful of concerns surfaced during the v0.11.0 design review that we deliberately deferred rather than block the milestone. None are urgent; all are worth addressing before the unified config shape ossifies further.

## Acceptance Criteria

### Schema URL versioning

- [x] Publish the JSON Schema at a versioned URL: `https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`. Keep the unversioned `https://refrakt.md/refrakt.config.schema.json` as a "latest" alias.
- [x] `create-refrakt` scaffolds reference the versioned URL matching the package version at scaffold time, so old projects don't get false errors when the schema gains fields.
- [x] Document the versioning policy in `site/content/docs/configuration/schema.md`: pin a specific version for stable validation, or use the unversioned alias to track latest.

### Mirroring footgun (legacy top-level field types)

- [x] Mark `contentDir`, `theme`, `target` on `RefraktConfig` as optional in `@refrakt-md/types`. They're only required for flat-shape and single-site configs, and currently they're typed as required strings — which papers over the multi-site case where they're undefined.
- [x] Audit adapter code that reads `config.contentDir` etc. and either add null checks or migrate to `resolveSite(config).site.contentDir` per WORK-166's pattern.
- [x] Update tests that asserted these fields as definite to handle the optional case.

### Three input shapes — deprecation timeline

- [x] Decide on a deprecation path for the flat shape. Suggested: deprecate in v0.12 release notes (no removal), pull flat-shape examples out of new docs (overview keeps a "legacy" callout), aim for removal in v1.0.
- [x] Add a runtime warning (one-time per process) when the loader sees a flat-shape config: "refrakt.config.json uses the legacy flat shape. Run `refrakt config migrate` to upgrade. Flat shape will be removed in v1.0."
- [x] Update the migration command's output to mention the planned removal.

### `target` field review

- [x] Audit which adapters actually validate or use `site.target`. Current finding: SvelteKit doesn't validate it; Astro/Nuxt/Next/Eleventy don't either. The field is increasingly vestigial.
- [x] Decide: deprecate the field entirely, or repurpose it as a documentation hint (which adapter this site is meant for). If deprecated, follow the same v0.12 → v1.0 timeline as the flat shape.

## Approach

These can be addressed independently and don't block each other. Suggested order:

1. **Schema URL versioning** — small, mechanical, eliminates a real footgun for users on older versions.
2. **Mirroring types** — small type change with a moderate audit of adapter code. Catches the "undefined for multi-site" footgun at compile time.
3. **Three shapes timeline** — mostly docs + a one-time warning. Sets expectations.
4. **`target` field** — investigation first, then a decision. Probably ends up deprecating.

## Dependencies

- {% ref "WORK-159" /%} — types and loader were established in v0.11.0; this work refines them.
- {% ref "ADR-010" /%} — the unified config shape we're polishing.

## References

- v0.11.0 design review (this work item is the audit output) — see commit history on `claude/v0.11.0-config-foundation` for context.
- `packages/types/src/theme.ts` — `RefraktConfig` legacy fields.
- `packages/transform/refrakt.config.schema.json` — the schema file to version.
- `packages/cli/src/commands/config.ts` — the migrate command to update.

## Resolution

Completed: 2026-05-09

Branch: `claude/update-milestones-work-176-DgWfz`

### What was done

**Schema URL versioning**

- `packages/transform/refrakt.config.schema.json` — `$id` updated to `https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`; description notes the unversioned URL as a "latest" alias.
- `packages/transform/package.json` — added `./refrakt.config.schema.json` export so consumers can import it directly.
- `site/src/routes/refrakt.config.schema.json/+server.ts` and `site/src/routes/schemas/v0.11/refrakt.config.schema.json/+server.ts` — prerendered SvelteKit endpoints serving the schema body at both URLs (verified in `site/build/`).
- `packages/create-refrakt/src/scaffold.ts` — added `getRefraktSchemaVersion()` deriving `vMAJOR.MINOR` from the package version and using it in `generateRefraktConfig()`.
- `packages/create-refrakt/test/scaffold.test.ts` — assertion strengthened from "defined" to a regex matching `https://refrakt.md/schemas/vX.Y/refrakt.config.schema.json`.
- `site/content/docs/configuration/schema.md` — documented versioned vs unversioned policy, "which one should I reference?" guidance, and how `$id` interacts with editor caching.

**Mirroring footgun (optional types + adapter audit)**

- `packages/types/src/theme.ts` — `RefraktConfig.contentDir`, `theme`, `target` now optional with JSDoc pointing to `resolveSite()`. `SiteConfig.target` is now optional too (documentation-only, slated for removal).
- `packages/sveltekit/src/config.ts` — flat-shape validator no longer requires `target` (validates type when present), the spread that builds the returned config conditionally includes `target`, and the "create one with at minimum" error message dropped the `target` key.
- `packages/cli/src/commands/edit.ts` — switched from `config.contentDir`/`config.theme` to `resolveSite(config).site.*`; renamed local `projectConfig` → `projectSite` so all later reads pull site-scoped fields. Multi-site projects now get a clear "pass --content-dir or pick a site" error instead of a silent undefined.
- `packages/cli/src/commands/theme.ts` — `theme install` rejects multi-site configs with a clear message; `theme install`/`info` use new `readThemeFromConfig`/`writeThemeIntoConfig` helpers that prefer `site.theme` / `sites[only].theme` over the legacy top-level field.
- `packages/create-refrakt/template-astro/src/setup.ts`, `template-html/build.ts`, `template/src/routes/+layout.server.ts` — all three templates now use `loadRefraktConfig` + `resolveSite` from `@refrakt-md/transform/node`, then read `site.contentDir`/`site.theme`/`site.plugins`/`site.runes`/`site.highlight`/etc. instead of top-level mirrors. Matches the multi-site `sites.main` shape that `create-refrakt` actually scaffolds.

**Three input shapes — deprecation timeline**

- `packages/transform/src/config-normalize.ts` — added `flatShapeWarningEmitted` flag, `__resetFlatShapeWarningForTests`, and a one-time `console.warn` in the flat-shape branch citing v0.12 deprecation and v1.0 removal. New `suppressFlatShapeWarning` option on `NormalizeOptions` lets tooling and tests opt out.
- `packages/transform/src/adapter-node.ts` — `loadRefraktConfig`/`loadRefraktConfigWithRaw` accept and forward the `suppressFlatShapeWarning` option.
- `packages/cli/src/config-file.ts` — `loadRefraktConfigFile` accepts the option and forwards it.
- `packages/cli/src/commands/config.ts` — `refrakt config migrate` detects flat-shape inputs via new `isFlatShape()` helper, prints "Upgraded from legacy flat shape" + v1.0-removal note after a successful flat → nested migration, and `--help` text now includes the deprecation note.
- `packages/transform/test/config-normalize.test.ts` — added a "flat-shape deprecation warning" describe block (3 tests: emits once, does not warn for nested, respects suppress option). Existing flat-shape tests now use a `normalizeFlat()` helper that suppresses the warning.
- `packages/sveltekit/test/config.test.ts` — `throws when target is missing` test replaced by `accepts a config without target` + `rejects a target that is present but empty`.
- Docs: `site/content/docs/configuration/overview.md` removed the flat-shape JSON example from the recommended shapes section, demoted to a `{% hint type="note" %}` callout. `migration.md` replaced the indefinite "continues to work" wording with a v1.0-removal `{% hint type="warning" %}`. `sites.md`, `plugins.md`, and `schema.md` all flag flat shape as deprecated.

**`target` field review**

- Confirmed via grep that no adapter (`packages/{astro,nuxt,next,eleventy,html}/src/`) reads `site.target`. Only `packages/sveltekit/src/config.ts` referenced it (validation only, not behavior).
- Decision: keep the field as a documentation hint, mark it deprecated. `SiteConfig.target` is optional. Schema marks it `"deprecated": true` with description noting v1.0 removal. Sveltekit validator no longer requires it. Scaffolds still write `target: 'svelte'` etc. so users see which adapter the scaffold was built for; can remove in v1.0.

**Plan and changeset**

- `.changeset/work-176-config-followups.md` — minor bump for `@refrakt-md/types`, `@refrakt-md/transform`, `@refrakt-md/sveltekit`, `@refrakt-md/cli`, `create-refrakt` summarizing the four buckets above.
- `plan/milestones/v0.11.0.md` — status `complete`.
- `plan/milestones/v0.12.0.md` — status `active`.

### Notes

- The site build verifies the schema endpoints — `/refrakt.config.schema.json` and `/schemas/v0.11/refrakt.config.schema.json` are byte-identical and prerender to static JSON files in `site/build/`.
- The flat-shape warning is once-per-process via a module-level boolean. Tests reset it with `__resetFlatShapeWarningForTests()` and the rest of the test suite uses the `suppressFlatShapeWarning` option to keep test output clean while still verifying the warning machinery in the dedicated tests.
- All 2331 tests in the monorepo pass after the changes.
- `target` field decision lands somewhere between "deprecate entirely" and "repurpose": kept as an optional documentation hint for v0.12 (no removal), schema-marked deprecated, scheduled for removal in v1.0 alongside the flat shape. This avoids a breaking change in v0.12 while signaling the direction.

{% /work %}
