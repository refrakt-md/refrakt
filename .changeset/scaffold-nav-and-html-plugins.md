---
'create-refrakt': patch
---

A freshly scaffolded project now builds with no errors. The SvelteKit, Astro, Eleventy, Next and Nuxt starters linked their nav item to `getting-started` instead of `docs/getting-started`, so every page reported an unresolved nav slug (BUG-035). The HTML starter's `build.ts` now passes the configured plugins to `loadContent`, along with `projectRoot` and the site config, so plugin pipeline hooks and declarative `registers` run and the cross-page features that depend on them are no longer empty (BUG-036). Its `tsconfig.json` now uses `"module": "ESNext"`, so `tsc` accepts the `import(..., { with: { type: "json" } })` in `build.ts`.
