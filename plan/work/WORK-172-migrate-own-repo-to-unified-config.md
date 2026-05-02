{% work id="WORK-172" status="done" priority="medium" complexity="simple" tags="config, migration, repo, dogfooding" source="ADR-010" milestone="v0.11.0" %}

# Migrate this repo's site config to the unified root config

Move `site/refrakt.config.json` to a unified `refrakt.config.json` at the repo root, declaring `plugins`, the `plan` section, and `sites.main` (or whatever name we settle on) for the existing site. Validates the design against our own project and gives us a multi-site-ready structure for any future additions (separate plan dashboard site, blog, etc.).

## Acceptance Criteria

- [x] New `refrakt.config.json` at repo root with `plugins`, `plan`, and `sites.main` sections
- [x] `sites.main` carries everything currently in `site/refrakt.config.json` (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`, `siteName`, `logo`, `baseUrl`)
- [x] `plan.dir = "plan"`
- [x] `plugins` lists the actually-installed plugin-bearing packages (`@refrakt-md/plan` at minimum; review whether others should be listed)
- [x] `site/vite.config.ts` updated to pass `site: 'main'` to the SvelteKit plugin
- [x] Old `site/refrakt.config.json` removed
- [x] `npm run build`, `npm test`, and `npm run dev` (in `site/`) all succeed
- [x] CI passes
- [x] `$schema` reference at the top of the new root config pointing at the published JSON Schema (from WORK-159)

## Approach

1. Run `refrakt config migrate --to nested` on `site/refrakt.config.json` (or do it by hand) to produce the singular-`site` shape, then promote `site` to `sites.main` manually.

2. Move the resulting file to repo root.

3. Add `site: 'main'` to the `refrakt(...)` call in `site/vite.config.ts`.

4. Delete `site/refrakt.config.json`.

5. Verify the SvelteKit plugin's `cwd`-resolution finds the root config from inside `site/` (it should, via upward walk; if not, document the override).

6. Run the full test/build matrix to confirm nothing broke.

## Dependencies

- {% ref "WORK-159" /%}, {% ref "WORK-166" /%}, {% ref "WORK-171" /%} — all need to land first
- {% ref "WORK-168" /%} — plan package needs to read `plan.dir` from the config so existing `npx refrakt plan …` invocations keep working

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `site/refrakt.config.json` — current source
- `site/vite.config.ts` — needs `site` option added

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `refrakt.config.json` (new, repo root) — Unified config declaring `plugins`, `plan`, and `sites.main`. The `main` site contains everything previously in `site/refrakt.config.json` (contentDir, theme, target, packages, routeRules, icons, backgrounds, siteName, logo, baseUrl). `$schema` references `./refrakt.config.schema.json` (the symlink pointing at the published copy under `packages/transform/`).
- `site/refrakt.config.json` — Deleted.
- `site/vite.config.ts` — `refrakt(...)` now receives `configPath: '../refrakt.config.json'` and `site: 'main'`. Existing `variables` option preserved.
- `packages/sveltekit/src/virtual-modules.ts` — `BuildContext` extended with `configPath` and `siteName` fields. `generateContentModule` resolves the configPath relative to the vite resolvedRoot (so the absolute path baked into the virtual module is correct) and passes `site` through to `createRefraktLoader`. New `resolvePath()` helper does pure POSIX-style normalization for the embedded path string.
- `packages/sveltekit/src/plugin.ts` — `load()` now passes `configPath` and `siteName: activeSiteName` into the BuildContext so SSR runtime picks the same site as the build.
- `packages/content/src/refract-loader.ts` — `createRefraktLoader` now reads `RefraktLoaderOptions.site`, normalizes the loaded config via `normalizeRefraktConfig`, resolves the active site via `resolveSite`, and reads all theme/icons/packages/runes/tints/backgrounds/highlight from the resolved site instead of the top level.
- `CLAUDE.md` — Removed `--config site` from the contracts examples (no longer needed; default cwd resolution works from the repo root).

### Notes

- Smoke tests:
  - `node packages/cli/dist/bin.js inspect hint --type=warning` — works from repo root, picks up the site config.
  - `node packages/cli/dist/bin.js contracts -o /tmp/contracts.json` — produces 117 runes (all packages merged).
  - `node packages/cli/dist/bin.js plugins list` — finds `@refrakt-md/plan` via config.plugins.
  - `npm --workspace=site run build` — completes successfully: 143 pages parsed, 1622 entities, 4 packages, full pagefind index.
- The clean rebuild was important — stale `.svelte-kit/output` chunks held the old hardcoded path and would shadow the rebuild until cleared.
- `contentDir: './content'` stays as-is in the moved config because the SvelteKit plugin still resolves it relative to vite's resolved root (`site/`), not the config file location. Documenting this contract for future reference: `site.contentDir` is interpreted relative to the vite app's root, not the config file.
- All 2314 tests still pass.

{% /work %}
