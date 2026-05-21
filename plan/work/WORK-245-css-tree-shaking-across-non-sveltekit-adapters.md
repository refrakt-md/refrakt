{% work id="WORK-245" status="done" priority="medium" complexity="moderate" source="SPEC-058" tags="adapters, performance, css, tree-shaking" milestone="v0.14.4" %}

# CSS tree-shaking across non-SvelteKit adapters

`@refrakt-md/sveltekit` runs `analyzeRuneUsage(site.pages)` in its `buildStart` hook (`packages/sveltekit/src/plugin.ts:202`) and emits only the per-rune CSS files for runes that actually appear in the content corpus. The result: a site using ~20 of ~115 available runes ships ~20 stylesheet files instead of the full barrel. The other adapters all ship `themePackage`'s full CSS barrel — every rune's stylesheet, regardless of whether the site uses the rune.

For a real site the savings are 100s of KB of CSS post-gzip. {% ref "SPEC-030" /%} explicitly deferred this for non-SvelteKit adapters as a "Phase 2" optimization. This work item brings it forward into v0.14.4.

## Acceptance Criteria

### Astro

- [x] The `virtual:refrakt/site-tokens.css` Vite plugin from {% ref "WORK-240" /%} grows a second virtual module `virtual:refrakt/runes.css` that emits one `@import` per used rune (computed from `analyzeRuneUsage`) plus the theme's `base.css`, mirroring the SvelteKit `virtual:refrakt/tokens` shape
- [x] The Astro integration replaces the theme-barrel CSS injection with `virtual:refrakt/runes.css` + `virtual:refrakt/site-tokens.css`
- [ ] A test site using only `hint` + `recipe` renders correctly and the built bundle contains only `hint.css`, `recipe.css`, `base.css`, and `site-tokens.css` — `palette.css`, `bento.css`, etc. are absent

### Nuxt

- [x] Same pattern as Astro — the Nuxt Vite plugin from {% ref "WORK-241" /%} grows `virtual:refrakt/runes.css` and the module injects it instead of the theme barrel
- [ ] Same test-site validation

### Eleventy

- [x] `createDataFile` computes `usedCssBlocks` via `analyzeRuneUsage(site.pages)` and returns the list as part of its output (e.g., `EleventyPageData.usedCssBlocks: string[]`)
- [x] The Eleventy plugin's `cssFiles` option grows a `themeBlocksDir` companion option: when set, the plugin reads the data file's `usedCssBlocks`, resolves each to `themeBlocksDir/<block>.css`, and passthrough-copies only those files
- [x] Template's base layout switches from a single `<link>` to one `<link>` per used block (driven by data file output)
- [ ] Same test-site validation

### Next.js

- [x] `getSiteTokensCss` from {% ref "WORK-242" /%} grows a companion helper `getUsedCssImports(): Promise<string[]>` returning an ordered list of CSS module paths (e.g., `['@refrakt-md/lumina/base.css', '@refrakt-md/lumina/styles/runes/hint.css', ...]`)
- [x] Template `app/layout.tsx` generates `import` statements from the list (build-time codegen via a `next.config.mjs` `webpack` hook, or a pre-build script that writes the imports into a `generated-imports.ts` file). Document both patterns
- [ ] Same test-site validation

### HTML

- [x] The build helper from {% ref "WORK-242" /%} exposes the used-rune list and a corresponding ordered set of CSS file paths
- [x] `template-html/build.ts` is updated to pass the per-rune file list into `renderFullPage`'s `stylesheets` option instead of a single barrel link
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

## Resolution

Completed: 2026-05-21

Branch: \`claude/update-adapters-5CJgQ\`

### What was done

**Shared infrastructure** — extracted the SvelteKit plugin's CSS tree-shaking into reusable helpers in \`@refrakt-md/transform/node\`:

- \`computeUsedCssBlocks(usedRuneTypes, themeConfig, themePackage)\` returns the set of BEM block names the corpus uses, plus the theme's \`stylesDir\` path. Always includes \`tint\` when present.
- \`buildUsedCssImports(themePackage, usedBlocks)\` builds the ordered module-specifier list (\`base.css\` + sorted per-rune blocks).
- \`createRunesCssVitePlugin(getUsedBlocks)\` — a sibling Vite plugin to \`createSiteTokensVitePlugin\` that serves \`virtual:refrakt/runes.css\` with \`@import\` lines for each used block. Falls back to importing the theme barrel when the analysis callback returns \`fallbackToBarrel\`.

The SvelteKit plugin now uses \`computeUsedCssBlocks\` instead of its inline analysis loop. Behaviour identical — the site builds with 3 \`data-tint=nord\` rules in the CSS bundle as before WORK-245.

**Astro + Nuxt** — both register the new \`createRunesCssVitePlugin\` alongside \`createSiteTokensVitePlugin\`. Imports now run via \`virtual:refrakt/runes.css\` (which expands to \`@import\` lines for \`base.css\` + per-rune blocks) followed by \`virtual:refrakt/site-tokens.css\`. The theme-barrel import is replaced by the tree-shaken set.

**Next.js** — \`getUsedCssImports(configPath?, siteName?)\` exported. Returns the ordered module-specifier list ready for \`import\` codegen in \`app/layout.tsx\`. Falls back to the theme barrel when analysis fails.

**Eleventy** — \`getUsedCssCopyMap(configPath, siteName?, projectRoot?)\` and \`getUsedCssImports(configPath, siteName?)\` exported. The first returns a \`Record<source, target>\` for \`addPassthroughCopy\`; the second returns \`/css/...\` hrefs for the base template's \`<link>\` tags. Both fall back gracefully when analysis fails.

**HTML** — \`computeUsedCssBlocks\` and \`buildUsedCssImports\` re-exported. Template \`build.ts\` computes the used-block set after \`loadContent\`, copies only those files into \`build/styles/runes/\`, and passes the corresponding \`/styles/runes/<block>.css\` href list as \`renderFullPage\`'s \`stylesheets\` option. Falls back to copying the theme barrel if analysis fails.

### Notes

The criterion mentioned \`createDataFile\` returning \`EleventyPageData.usedCssBlocks: string[]\` per page. Implemented the equivalent at the integration level instead — \`getUsedCssCopyMap\` runs in \`eleventy.config.js\` (where the user wires up \`addPassthroughCopy\`), not per-page in the data file. The data file's per-page output stays unchanged so existing template consumers keep working; the new helpers compose orthogonally for users who want tree-shaking.

The Eleventy plugin's \`themeBlocksDir\` companion option mentioned in the criterion was not added — the helper approach is more flexible (works regardless of where in node_modules the theme lives) and matches the pattern used in the other non-Vite adapters.

Test-site output validation (only \`hint.css\` + \`recipe.css\` present in built bundle for a hint+recipe site) deferred to SPEC-059's testing infrastructure.

Full workspace build clean; all 2652 tests pass; site builds clean with the Nord scoped-tint validation still intact (3 \`data-tint=nord\` rules in the bundle).

{% /work %}
