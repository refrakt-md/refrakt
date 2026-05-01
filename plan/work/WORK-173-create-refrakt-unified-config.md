{% work id="WORK-173" status="draft" priority="medium" complexity="moderate" tags="create-refrakt, config, scaffolding" source="ADR-010" milestone="v0.11.0" %}

# Update create-refrakt scaffolds for the unified config shape

`create-refrakt` currently writes a flat-shape `site/refrakt.config.json` for site projects and (via `plan init`) no config at all for plan projects. Update both paths to produce the new unified root-shape config — site projects get a `sites.main` section, plan projects get a `plan` section, and any combined scaffolds (future) declare both.

## Acceptance Criteria

- [ ] `create-refrakt --type site` produces a root-level `refrakt.config.json` with `plugins` and `sites.main`, not the old flat shape
- [ ] The site name in the config (`sites.main` or whatever default we pick) is documented in the scaffold's README so users know how to add a second site later
- [ ] `create-refrakt --type plan` ends up with a `refrakt.config.json` containing only a `plan` section — produced by `plan init` (per WORK-168)
- [ ] `create-refrakt --type theme` is unaffected (themes don't ship a project-level config)
- [ ] Generated `vite.config.ts` for site scaffolds passes `site: 'main'` to the refrakt plugin
- [ ] Generated `package.json` for site scaffolds lists the rune packages under both `dependencies` and the config's `plugins` array (where appropriate) and `sites.main.packages` (for site rune merging)
- [ ] Tests in `packages/create-refrakt/test/` cover the new config shape for both site and plan types
- [ ] Smoke test: `npx create-refrakt my-site --type site --target svelte && cd my-site && npm install && npm run build` succeeds

## Approach

1. Update the site scaffold templates in `packages/create-refrakt/src/templates/site/` (or wherever the templates live) to emit the new config shape.

2. Update `scaffoldSite()` (or equivalent) to populate `plugins` and `sites.main.packages` based on the user's selections.

3. Update `vite.config.ts` template to include `site: 'main'`.

4. Plan scaffolding is delegated to `plan init` (WORK-168); confirm the integration produces a valid config.

5. Update test fixtures that assert on the generated config shape.

## Dependencies

- {% ref "WORK-159" /%}, {% ref "WORK-166" /%}, {% ref "WORK-168" /%} — config shape, SvelteKit plugin option, plan init scaffolding

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `packages/create-refrakt/src/scaffold.ts` — site scaffolding
- `packages/create-refrakt/src/templates/` — template files
- `packages/create-refrakt/test/` — existing tests to extend

{% /work %}
