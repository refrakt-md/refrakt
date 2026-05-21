{% work id="WORK-245" status="ready" priority="medium" complexity="moderate" source="SPEC-058" tags="adapters, performance, css, tree-shaking" milestone="v0.14.4" %}

# CSS tree-shaking across non-SvelteKit adapters

`@refrakt-md/sveltekit` runs `analyzeRuneUsage(site.pages)` in its `buildStart` hook (`packages/sveltekit/src/plugin.ts:202`) and emits only the per-rune CSS files for runes that actually appear in the content corpus. The result: a site using ~20 of ~115 available runes ships ~20 stylesheet files instead of the full barrel. The other adapters all ship `themePackage`'s full CSS barrel — every rune's stylesheet, regardless of whether the site uses the rune.

For a real site the savings are 100s of KB of CSS post-gzip. {% ref "SPEC-030" /%} explicitly deferred this for non-SvelteKit adapters as a "Phase 2" optimization. This work item brings it forward into v0.14.4.

## Acceptance Criteria

### Astro

- [ ] The `virtual:refrakt/site-tokens.css` Vite plugin from {% ref "WORK-240" /%} grows a second virtual module `virtual:refrakt/runes.css` that emits one `@import` per used rune (computed from `analyzeRuneUsage`) plus the theme's `base.css`, mirroring the SvelteKit `virtual:refrakt/tokens` shape
- [ ] The Astro integration replaces the theme-barrel CSS injection with `virtual:refrakt/runes.css` + `virtual:refrakt/site-tokens.css`
- [ ] A test site using only `hint` + `recipe` renders correctly and the built bundle contains only `hint.css`, `recipe.css`, `base.css`, and `site-tokens.css` — `palette.css`, `bento.css`, etc. are absent

### Nuxt

- [ ] Same pattern as Astro — the Nuxt Vite plugin from {% ref "WORK-241" /%} grows `virtual:refrakt/runes.css` and the module injects it instead of the theme barrel
- [ ] Same test-site validation

### Eleventy

- [ ] `createDataFile` computes `usedCssBlocks` via `analyzeRuneUsage(site.pages)` and returns the list as part of its output (e.g., `EleventyPageData.usedCssBlocks: string[]`)
- [ ] The Eleventy plugin's `cssFiles` option grows a `themeBlocksDir` companion option: when set, the plugin reads the data file's `usedCssBlocks`, resolves each to `themeBlocksDir/<block>.css`, and passthrough-copies only those files
- [ ] Template's base layout switches from a single `<link>` to one `<link>` per used block (driven by data file output)
- [ ] Same test-site validation

### Next.js

- [ ] `getSiteTokensCss` from {% ref "WORK-242" /%} grows a companion helper `getUsedCssImports(): Promise<string[]>` returning an ordered list of CSS module paths (e.g., `['@refrakt-md/lumina/base.css', '@refrakt-md/lumina/styles/runes/hint.css', ...]`)
- [ ] Template `app/layout.tsx` generates `import` statements from the list (build-time codegen via a `next.config.mjs` `webpack` hook, or a pre-build script that writes the imports into a `generated-imports.ts` file). Document both patterns
- [ ] Same test-site validation

### HTML

- [ ] The build helper from {% ref "WORK-242" /%} exposes the used-rune list and a corresponding ordered set of CSS file paths
- [ ] `template-html/build.ts` is updated to pass the per-rune file list into `renderFullPage`'s `stylesheets` option instead of a single barrel link
- [ ] Same test-site validation

## Approach

The analysis function `analyzeRuneUsage` already lives in `@refrakt-md/content`. The SvelteKit plugin's pattern at `packages/sveltekit/src/plugin.ts:202–234` extracts to a small reusable utility:

```ts
// packages/transform/src/node/used-css.ts (or appended to site-tokens.ts)
export async function computeUsedCssBlocks(
  site: SiteConfig,
  pages: TransformedPage[],
  assembledConfig: ThemeConfig,
  themePackage: string,
): Promise<{ usedBlocks: Set<string>; stylesDir: string }> {
  // Same body the SvelteKit plugin currently has, lifted whole.
}
```

The Vite-based adapters (Astro, Nuxt) reuse the virtual-module pattern from {% ref "WORK-240" /%} / {% ref "WORK-241" /%} — adding `virtual:refrakt/runes.css` is one more `resolveId`/`load` entry, computed in the same `buildStart`.

The non-Vite adapters (Eleventy, Next.js, HTML) expose `computeUsedCssBlocks` (or a higher-level `getUsedCssImports`) and let the template author wire it into the build. For Eleventy the data file already does this work; for Next.js a small pre-build script or webpack hook generates the imports; for HTML the script just iterates and passes paths to `renderFullPage`.

**Sandbox / non-`data-rune` runes:** the SvelteKit plugin currently includes `tint.css` unconditionally because tint is a universal attribute (not a rune). Replicate that fall-through in every adapter — `computeUsedCssBlocks` returns the set with `tint` already included when the theme's styles dir contains it.

## Dependencies

- {% ref "WORK-239" /%} — site-tokens extraction (companion: this work item lifts a sibling helper into the same shared module)
- {% ref "WORK-240" /%} — Astro Vite plugin (extends with second virtual module)
- {% ref "WORK-241" /%} — Nuxt Vite plugin (extends with second virtual module)
- {% ref "WORK-242" /%} — non-Vite adapter helpers (extends with used-blocks helper)

## References

- {% ref "SPEC-058" /%} — adapter parity spec (this item moves CSS tree-shaking out of "Out of scope")
- {% ref "SPEC-030" /%} — original deferral
- `packages/sveltekit/src/plugin.ts:202–234` — current SvelteKit implementation to extract
- `packages/content/src/analyze.ts` — `analyzeRuneUsage` (already shared)

{% /work %}
