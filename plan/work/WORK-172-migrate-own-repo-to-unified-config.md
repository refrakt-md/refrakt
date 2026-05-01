{% work id="WORK-172" status="draft" priority="medium" complexity="simple" tags="config, migration, repo, dogfooding" source="ADR-010" milestone="v0.11.0" %}

# Migrate this repo's site config to the unified root config

Move `site/refrakt.config.json` to a unified `refrakt.config.json` at the repo root, declaring `plugins`, the `plan` section, and `sites.main` (or whatever name we settle on) for the existing site. Validates the design against our own project and gives us a multi-site-ready structure for any future additions (separate plan dashboard site, blog, etc.).

## Acceptance Criteria

- [ ] New `refrakt.config.json` at repo root with `plugins`, `plan`, and `sites.main` sections
- [ ] `sites.main` carries everything currently in `site/refrakt.config.json` (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`, `siteName`, `logo`, `baseUrl`)
- [ ] `plan.dir = "plan"`
- [ ] `plugins` lists the actually-installed plugin-bearing packages (`@refrakt-md/plan` at minimum; review whether others should be listed)
- [ ] `site/vite.config.ts` updated to pass `site: 'main'` to the SvelteKit plugin
- [ ] Old `site/refrakt.config.json` removed
- [ ] `npm run build`, `npm test`, and `npm run dev` (in `site/`) all succeed
- [ ] CI passes
- [ ] `$schema` reference at the top of the new root config pointing at the published JSON Schema (from WORK-159)

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

{% /work %}
