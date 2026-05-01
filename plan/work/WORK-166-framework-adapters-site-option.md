{% work id="WORK-166" status="draft" priority="high" complexity="moderate" tags="adapters, sveltekit, astro, nuxt, next, eleventy, config, multi-site" source="ADR-010" milestone="v0.11.0" %}

# Framework adapters accept `site` option

Update all five framework adapter packages — `@refrakt-md/sveltekit`, `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy` — to accept a `site?: string` option. Each adapter resolves its target site via the shared normalizer from WORK-159, then reads `contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds` from the resolved site entry instead of the top-level config. Single-site projects and the legacy flat shape continue to work without changes; multi-site repos pick a target per adapter.

## Acceptance Criteria

- [ ] All five adapter factories (`refrakt({...})` for SvelteKit, the `integration()` for Astro, the Nuxt module options, the Next loader options, the Eleventy plugin options) accept an optional `site?: string` field
- [ ] When the loaded config has exactly one site and `site` is omitted, the adapter uses that site automatically
- [ ] When the loaded config has multiple sites and `site` is omitted, the adapter throws at config-load time with the list of available names
- [ ] When `site` references an undeclared name, the adapter throws with the available names and a "did you mean?" suggestion
- [ ] Each adapter's site-derived reads (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`) come from the resolved site entry, not the top-level config
- [ ] SvelteKit: `loadContent()`, virtual-module generation, and the HMR cache key all use the resolved site name
- [ ] Astro: `integration.ts`'s `noExternal`, content watch path, and SSR config use the resolved site
- [ ] Nuxt: `module.ts`'s transpile list and content watch use the resolved site
- [ ] Next: `loader.ts` and `metadata.ts` use the resolved site
- [ ] Eleventy: `plugin.ts` data + transform setup uses the resolved site
- [ ] Tests for each adapter cover: single-site default, single-site with explicit name, multi-site with explicit name, multi-site missing name (error), unknown site name (error)
- [ ] Existing `site/vite.config.ts` (and the example projects for each adapter, if they exist in the repo) continues to build without modification

## Approach

1. Expose a `resolveSite(config, requested?: string)` helper from `@refrakt-md/transform/node` (the shared loader from WORK-159) so all five adapters call into the same logic. Reuse this helper from the CLI's `--site` flag work in WORK-164.

2. For each adapter:
   - Add `site?: string` to the options interface
   - Call `resolveSite(config, options.site)` once at adapter setup
   - Replace direct reads of `config.contentDir` / `config.theme` / `config.packages` / `config.routeRules` / `config.icons` / `config.backgrounds` with reads from the resolved site entry
   - Update any cache keys or virtual-module names to include the site name where collisions are possible (SvelteKit's HMR cache, for instance)

3. Verify the change is mechanically identical across adapters — if any adapter has a non-trivial difference (e.g., the way it watches content paths or registers routes), document it inline so future adapter authors know the pattern.

4. Smoke test each adapter with a fresh single-site project and a hand-written multi-site fixture.

## Dependencies

- {% ref "WORK-159" /%} — needs the normalized `sites` map and the shared `resolveSite` helper
- {% ref "WORK-164" /%} — `--site` flag uses the same helper; coordinate the export shape

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config (multi-site sections, adapter consequences)
- `packages/sveltekit/src/` — SvelteKit plugin factory and content loader
- `packages/astro/src/integration.ts` — current `loadRefraktConfig` consumer
- `packages/nuxt/src/module.ts` — current `loadRefraktConfig` consumer
- `packages/next/src/loader.ts` — Next loader
- `packages/eleventy/src/plugin.ts` — Eleventy plugin

{% /work %}
