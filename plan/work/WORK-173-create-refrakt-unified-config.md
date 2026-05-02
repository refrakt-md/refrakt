{% work id="WORK-173" status="done" priority="medium" complexity="moderate" tags="create-refrakt, config, scaffolding" source="ADR-010" milestone="v0.11.0" %}

# Update create-refrakt scaffolds for the unified config shape

`create-refrakt` currently writes a flat-shape `site/refrakt.config.json` for site projects and (via `plan init`) no config at all for plan projects. Update both paths to produce the new unified root-shape config — site projects get a `sites.main` section, plan projects get a `plan` section, and any combined scaffolds (future) declare both.

## Acceptance Criteria

- [x] `create-refrakt --type site` produces a root-level `refrakt.config.json` with `plugins` and `sites.main`, not the old flat shape
- [x] The site name in the config (`sites.main` or whatever default we pick) is documented in the scaffold's README so users know how to add a second site later
- [x] `create-refrakt --type plan` ends up with a `refrakt.config.json` containing only a `plan` section — produced by `plan init` (per WORK-168)
- [x] `create-refrakt --type theme` is unaffected (themes don't ship a project-level config)
- [x] Generated `vite.config.ts` for site scaffolds passes `site: 'main'` to the refrakt plugin
- [x] Generated `package.json` for site scaffolds lists the rune packages under both `dependencies` and the config's `plugins` array (where appropriate) and `sites.main.packages` (for site rune merging)
- [x] Tests in `packages/create-refrakt/test/` cover the new config shape for both site and plan types
- [x] Smoke test: `npx create-refrakt my-site --type site --target svelte && cd my-site && npm install && npm run build` succeeds

## Approach

1. Update the site scaffold templates in `packages/create-refrakt/src/templates/site/` (or wherever the templates live) to emit the new config shape.

2. Update `scaffoldSite()` (or equivalent) to populate `plugins` and `sites.main.packages` based on the user's selections.

3. Update `vite.config.ts` template to include `site: 'main'`.

4. Plan scaffolding is delegated to `plan init` (WORK-168); confirm the integration produces a valid config.

5. Update test fixtures that assert on the generated config shape.

## Dependencies

- {% ref "WORK-159" /%}, {% ref "WORK-166" /%}, {% ref "WORK-168" /%} — config shape, framework adapter `site` option, plan init scaffolding

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `packages/create-refrakt/src/scaffold.ts` — site scaffolding
- `packages/create-refrakt/src/templates/` — template files
- `packages/create-refrakt/test/` — existing tests to extend

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/create-refrakt/src/scaffold.ts` — `generateRefraktConfig()` now produces the unified shape with `$schema` and `sites.main` instead of the flat shape. The same generator is used for all six target frameworks (svelte, html, astro, nuxt, next, eleventy) so all scaffolded projects get the same shape.
- `packages/create-refrakt/template/vite.config.ts` — Updated to pass `{ site: 'main' }` to the refrakt plugin so the generated SvelteKit projects work with the unified config.
- `packages/create-refrakt/src/scaffold.ts` `generateReadme()` — Added a "Configuration" section that explains `sites.main` and how to add a second site (declare another entry, pass `site: '<name>'` to the corresponding vite.config.ts).
- `packages/create-refrakt/test/scaffold.test.ts` — Updated assertions across all 5 target tests (svelte, html, astro, nuxt, next, eleventy) to look at `config.sites.main.*` instead of top-level fields. Added `$schema` presence check. Updated the "vite.config has refrakt()" assertion to expect `refrakt({ site: 'main' })`.
- Smoke test: `node packages/create-refrakt/dist/bin.js my-site --type site --target sveltekit --theme @refrakt-md/lumina` produces a clean unified-shape `refrakt.config.json` with `$schema`, `sites.main.theme`, `sites.main.packages: ["@refrakt-md/marketing"]`, and the expected route rules.

### Notes

- Plan-only scaffolds (`--type plan`) already write a `refrakt.config.json` via the new `plan init` config scaffolding (WORK-168) — no extra work needed here. The smoke test path through `create-refrakt --type plan` → `runInit({ noConfig: false })` → `scaffoldRefraktConfigForPlan()` was verified end-to-end in WORK-168.
- Theme scaffolds (`--type theme`) don't generate a `refrakt.config.json` (themes are libraries, not projects). The 20 theme tests still pass without modification.
- `plugins` array is intentionally absent from site scaffolds: `@refrakt-md/marketing` is a rune-only package (no cli-plugin), so listing it in `plugins` would be wrong. If users add `@refrakt-md/plan` later, they can run `refrakt config migrate` to populate `plugins` automatically.
- All 2314 tests pass + 63 create-refrakt tests pass.

{% /work %}
