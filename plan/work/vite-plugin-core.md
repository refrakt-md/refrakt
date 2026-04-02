{% work id="WORK-094" status="ready" priority="high" complexity="moderate" tags="vite, transform, frameworks" milestone="v1.0.0" %}

# Create @refrakt-md/vite plugin — Level 1 static transform

Build the core Vite plugin that intercepts `.md` files and emits JS modules with rendered HTML, frontmatter, SEO data, and serialized tree. This is the Level 1 (static, per-file) integration — no cross-page awareness.

## Acceptance Criteria

- [ ] New package `packages/vite/` with `package.json`, `tsconfig.json`, build config
- [ ] Plugin entry (`src/index.ts`) exports `refrakt()` function returning a Vite plugin
- [ ] Config accepts `packages`, `theme`, `extensions`, `injectCSS`, `level`, `contentDir`
- [ ] Per-file transform pipeline: Markdoc parse → rune schema transforms → serialize → identity transform → renderToHtml
- [ ] Each `.md` file emits a JS module exporting `html`, `tree`, `frontmatter`, `seo`, `meta`
- [ ] `seo` export includes `jsonLd` array and `og` object via `extractSeo()` from `@refrakt-md/runes`
- [ ] `meta` export includes `runes` (list of rune names used) and `packages` (list of package names)
- [ ] Community packages loaded via `loadRunePackage()` and merged via `mergePackages()`
- [ ] Runes requiring Level 2 (breadcrumb, nav, glossary auto-linking) render as static content with build warning
- [ ] Plugin sets `ssr.noExternal` for refrakt packages (same `CORE_NO_EXTERNAL` pattern as sveltekit)
- [ ] `vite` is a peer dependency (`^5.0.0 || ^6.0.0`)
- [ ] Package builds successfully in monorepo dependency order
- [ ] Basic integration test: transform a `.md` file with runes, verify module exports

## Approach

1. Scaffold `packages/vite/` — package.json, tsconfig extending root, tsup build config
2. Implement config parsing and validation in `src/index.ts`
3. Implement per-file transform in `src/transform.ts` — reuses `Markdoc.parse()`, rune schemas from `@refrakt-md/runes`, `serialize()` from `@refrakt-md/transform` (requires WORK-088), `createTransform()`, and `renderToHtml()`
4. Wire up Vite's `transform` hook to intercept configured extensions
5. Emit JS module string with named exports
6. Add `resolveId`/`load` hooks for virtual module support (used by WORK-095)

## Dependencies

- WORK-088 — `serialize()` must be available from `@refrakt-md/transform`

## References

- SPEC-031 (Architecture, Configuration, Level 1 sections)
- `packages/sveltekit/src/plugin.ts` — existing Vite plugin to reference
- `packages/transform/src/engine.ts` — identity transform
- `packages/transform/src/html.ts` — `renderToHtml()`

{% /work %}
