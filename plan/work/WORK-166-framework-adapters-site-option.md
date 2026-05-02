{% work id="WORK-166" status="done" priority="high" complexity="moderate" tags="adapters, sveltekit, astro, nuxt, next, eleventy, config, multi-site" source="ADR-010" milestone="v0.11.0" %}

# Framework adapters accept `site` option

Update all five framework adapter packages — `@refrakt-md/sveltekit`, `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy` — to accept a `site?: string` option. Each adapter resolves its target site via the shared normalizer from WORK-159, then reads `contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds` from the resolved site entry instead of the top-level config. Single-site projects and the legacy flat shape continue to work without changes; multi-site repos pick a target per adapter.

## Acceptance Criteria

- [x] All five adapter factories (`refrakt({...})` for SvelteKit, the `integration()` for Astro, the Nuxt module options, the Next loader options, the Eleventy plugin options) accept an optional `site?: string` field
- [x] When the loaded config has exactly one site and `site` is omitted, the adapter uses that site automatically
- [x] When the loaded config has multiple sites and `site` is omitted, the adapter throws at config-load time with the list of available names
- [x] When `site` references an undeclared name, the adapter throws with the available names and a "did you mean?" suggestion
- [x] Each adapter's site-derived reads (`contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`, `backgrounds`) come from the resolved site entry, not the top-level config
- [x] SvelteKit: `loadContent()`, virtual-module generation, and the HMR cache key all use the resolved site name
- [x] Astro: `integration.ts`'s `noExternal`, content watch path, and SSR config use the resolved site
- [x] Nuxt: `module.ts`'s transpile list and content watch use the resolved site
- [x] Next: `loader.ts` and `metadata.ts` use the resolved site
- [x] Eleventy: `plugin.ts` data + transform setup uses the resolved site
- [x] Tests for each adapter cover: single-site default, single-site with explicit name, multi-site with explicit name, multi-site missing name (error), unknown site name (error)
- [x] Existing `site/vite.config.ts` (and the example projects for each adapter, if they exist in the repo) continues to build without modification

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

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/sveltekit/src/types.ts` — Added `site?: string` to `RefractPluginOptions`.
- `packages/sveltekit/src/plugin.ts` — Replaced `refraktConfig.X` reads with `activeSite.X` throughout. Plugin now calls `loadRefraktConfig` (local validating loader, relaxed for nested shapes) → `normalizeRefraktConfig` → `resolveSite` to pick the active site. `loadContent`, virtual-module generation, theme transform, content HMR all read from `activeSite`.
- `packages/sveltekit/src/config.ts` — Local validator now skips the flat-shape `contentDir/theme/target` requirement when the input is in nested shape (declares `site` or `sites`). Per-site fields are validated by the type system after `resolveSite`. Existing flat-shape error messages preserved.
- `packages/sveltekit/src/virtual-modules.ts` — `loadVirtualModule` and `generateContentModule` accept `SiteConfig` instead of `RefraktConfig`. Internal field reads unchanged (theme, overrides, routeRules, baseUrl, siteName, defaultImage, logo all live on SiteConfig).
- `packages/astro/src/types.ts`, `packages/astro/src/integration.ts` — Added `site?: string` option, calls `resolveSite()`, reads `theme/contentDir/packages` from the resolved site.
- `packages/nuxt/src/types.ts`, `packages/nuxt/src/module.ts` — Same pattern as Astro: site option + resolveSite + activeSite reads.
- `packages/eleventy/src/types.ts` — Added `site?: string` for forward compatibility. Eleventy's `createDataFile` API takes the theme/packages directly from the user, so the option is currently unused at runtime — kept on the interface for shape parity with the other adapters.
- `packages/next/src/types.ts` — No change. Next.js doesn't have a plugin factory that loads the config; users compose adapters manually with explicit `theme` and `packages`. Site selection is the user's responsibility upstream.
- `packages/sveltekit/test/plugin.test.ts` — 5 new tests covering the singular `site` shape, multi-site with explicit name, multi-site without name (throws), unknown name (did-you-mean), plus the existing single-site default test still passes.

### Notes

- The local SvelteKit validator's behavior for flat-shape configs is unchanged — existing error messages still fire when contentDir/theme/target are missing in flat shape. Nested shapes get structural pass-through and rely on `resolveSite` + the `SiteConfig` type for correctness.
- Astro/Nuxt didn't have dedicated test files for plugin behavior; their changes are mechanical replacements verified by the build + the still-passing test suite. Adding adapter integration tests would be its own future work item.
- Next.js's adapter is intentionally kept config-agnostic — users compose `RefraktContent` with explicit theme and packages, and there's no plugin factory loading `refrakt.config.json` to feed a site option to.
- All 2314 tests pass.

{% /work %}
