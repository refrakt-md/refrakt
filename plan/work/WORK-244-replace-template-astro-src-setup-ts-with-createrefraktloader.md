{% work id="WORK-244" status="ready" priority="medium" complexity="simple" source="SPEC-058" tags="adapters, astro, templates, refactor" milestone="v0.14.4" %}

# Replace template-astro/src/setup.ts with createRefraktLoader

`packages/create-refrakt/template-astro/src/setup.ts` (92 lines) hand-rolls the loader pipeline:

1. `loadRefraktConfig` + `resolveSite`
2. Theme module import + manifest read
3. Plugin loading via `loadPlugin` + `mergePlugins`
4. `assembleThemeConfig` + `createTransform`
5. Lazy `createHighlightTransform`
6. Per-call `loadContent`

`@refrakt-md/content`'s `createRefraktLoader` (`packages/content/src/refract-loader.ts:172`) does **all** of this plus the things setup.ts misses: tint-preset loading for {% ref "SPEC-056" /%}, `themeOverrides` (`site.tints`, `site.backgrounds`) passed through `assembleThemeConfig`, site caching with `invalidateSite`, and the `extensions` field forwarded from `mergePlugins`.

Replacing setup.ts with a thin wrapper around `createRefraktLoader` deletes ~70 lines from the template and fixes its current bugs:

- Scoped tints declared in `site.tints[].extends` (preset path) don't project into CSS because setup.ts doesn't run `loadPresets`
- Plugin rune extensions (`Plugin.extensions`) are dropped because setup.ts builds the `assembleThemeConfig` input without the `extensions` field

This is a cleanup item — existing sites generated from the template still work; they just don't pick up scoped tints or plugin extensions. After this lands, new sites are correct.

## Acceptance Criteria

- [ ] `packages/create-refrakt/template-astro/src/setup.ts` is reduced to ~15–20 lines that instantiate `createRefraktLoader` and re-export its methods (`getTransform`, `getHighlightTransform`, `getSite`) plus a `getTheme()` helper that reads the manifest + layouts via the established Astro path
- [ ] The `getTheme()` helper is the only template-specific code remaining — it builds the `AstroTheme` object (`{ manifest, layouts }`) from the theme package, baking in `routeRules`, `siteName`, `baseUrl`, `defaultImage`, `logo` from the resolved site config so adapter SEO threading (the sibling item in this milestone) has the fields it needs
- [ ] All existing `[...slug].astro` template behaviour preserved — the page builder logic at `packages/create-refrakt/template-astro/src/pages/[...slug].astro` continues to work without modification (or with minimal updates)
- [ ] An `npx create-refrakt my-test-astro --template astro` site builds cleanly and renders pages with the same output the SvelteKit reference produces for the same content
- [ ] A test config with `site.tints.nord = { extends: "@refrakt-md/lumina/presets/nord" }` produces `[data-tint="nord"]` scoped CSS in the built output (validates the SPEC-056 preset-loading path is now active)

## Approach

The replacement reduces to:

```ts
// packages/create-refrakt/template-astro/src/setup.ts
import { createRefraktLoader } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { getThemePackage } from '@refrakt-md/types';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const loader = createRefraktLoader({
  configPath: resolve('refrakt.config.json'),
});

export const getTransform = () => loader.getTransform();
export const getHighlightTransform = () => loader.getHighlightTransform();
export const getSite = () => loader.getSite();

export async function getTheme() {
  // Resolve once, read theme manifest + layouts, bake in SEO fields from site config
  const config = loadRefraktConfig(resolve('refrakt.config.json'));
  const { site } = resolveSite(config);
  const themePackage = getThemePackage(site.theme);
  const layouts = (await import(themePackage + '/layouts')).layouts;
  const manifestPath = createRequire(import.meta.url).resolve(themePackage + '/manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  return {
    manifest: {
      ...manifest,
      routeRules: site.routeRules ?? [{ pattern: '**', layout: 'default' }],
      ...(site.siteName && { siteName: site.siteName }),
      ...(site.baseUrl && { baseUrl: site.baseUrl }),
      ...(site.defaultImage && { defaultImage: site.defaultImage }),
      ...(site.logo && { logo: site.logo }),
    },
    layouts,
  };
}
```

The `getTheme()` helper duplicates a small amount of work (it calls `loadRefraktConfig` / `resolveSite` again, even though `createRefraktLoader` already resolved them internally). The duplication is acceptable because the loader doesn't currently expose its resolved `site` — opening that up is out of scope here; can be revisited later if multiple templates need the same pattern.

## Dependencies

This work item is independent — it can land any time the milestone is open. It coordinates with the milestone's SEO threading item (the SEO fields baked into the manifest become consumable once SEO threading lands) but does not block on it.

## References

- {% ref "SPEC-058" /%} — adapter parity spec, "Cleanup: `template-astro/src/setup.ts` uses `createRefraktLoader`"
- `packages/create-refrakt/template-astro/src/setup.ts` — file to replace
- `packages/content/src/refract-loader.ts:172` — `createRefraktLoader` reference

{% /work %}
