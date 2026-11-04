{% spec id="SPEC-190" status="draft" tags="adapters, cli, content, simplification, sveltekit, astro, nuxt, next, eleventy" %}

# One site-loading path for every adapter and the CLI

Turning a `refrakt.config.json` site into "the runes, the merged plugins and the assembled theme
config" happens in one function, and every adapter, the CLI, the editor and the language server
call it. The same goes for the smaller steps every adapter repeats: the theme-config fallback, the
used-blocks resolver, the content-HMR Vite plugin and client behaviour bootstrapping.

## Why

**The plugin merge sequence is copied about seven times.** The sequence
`loadPlugin → mergePlugins → loadLocalRunes → applyAliases → assembleThemeConfig` appears in:

- `packages/content/src/refract-loader.ts` (`createRefraktLoader`, which Astro and Nuxt use)
- `packages/sveltekit/src/plugin.ts:97-180`, inline
- `packages/cli/src/bin.ts:293-406` (`loadMergedConfig`)
- `packages/cli/src/bin.ts` again in `buildReferenceContext`, whose doc comment says it matches
  `loadMergedConfig`, and inline in the `inspect` path (`bin.ts:705`)
- `packages/cli/src/commands/edit.ts`
- `packages/language-server/src/registry/loader.ts:230-265`
- `packages/create-refrakt/template-html/build.ts:73-90`

The theme-config fallback `themeConfig ?? luminaConfig ?? default` is repeated in eight files
across eleventy, sveltekit, the language server, content, nuxt, astro, next and the html template.

**The copies drift.** Astro (`integration.ts:92`) and Nuxt (`module.ts:84`) read the deprecated
`sandbox.examplesDir` for the HMR watcher, while SvelteKit reads `sandbox.dir ?? examplesDir`.
It works today only because `normalizeRefraktConfig` mirrors `dir` onto `examplesDir`
({% ref "ADR-022" /%}). It's latent, not live, but it's exactly the kind of difference a shared function
can't have, and removing the alias at v1.0 would break two adapters silently.

**SvelteKit validates config its own way.** `packages/sveltekit/src/config.ts` (284 lines) is a
hand-rolled `loadRefraktConfig` + `validateConfig` that checks the legacy flat shape's fields
(`theme`, `target`, `overrides`, `routeRules`, `highlight`, `plugins`) and then hands the result
to `normalizeRefraktConfig` anyway. Every other adapter uses the shared
`loadRefraktConfig` in `packages/transform/src/adapter-node.ts`. So a config error throws in
SvelteKit and passes everywhere else.

**Smaller repeated blocks:**

- `getUsedBlocks` in `astro/integration.ts:58-87`, `nuxt/module.ts:53-79`,
  `next/tokens.ts:95-118` and `eleventy/tokens.ts:106-131`.
- The content-HMR Vite plugin in `astro/integration.ts:90-112` and `nuxt/module.ts:82-100`.
- Client behaviour bootstrapping (`RfContext → registerElements → initRuneBehaviors +
  initLayoutBehaviors → combined cleanup`) in `next/src/client.tsx`, `nuxt/src/client.ts`,
  `html/src/client.ts` and `astro/src/behaviors.ts`, with the page-entry type copied into three of
  them and `hasInteractiveRunes` identical in four.
- `adapter-node.ts` has two read-and-parse blocks (`loadRefraktConfig` and
  `loadRefraktConfigWithRaw`) where one should call the other.

## Decisions

### D1 — `resolveSiteRunes()` is the one merge path

`@refrakt-md/content` exports

```ts
resolveSiteRunes(site: SiteConfig, opts: { configDir: string; project?: … })
  : Promise<{ tags; runes; merged; themeConfig; diagnostics }>
```

which runs the full sequence once, including the theme-config fallback (`loadThemeConfig(pkg)`).
`createRefraktLoader`, the SvelteKit plugin, every CLI command, `refrakt edit`, the language
server and the html template call it. `loadMergedConfig` and `buildReferenceContext` in
`bin.ts` are deleted. A test checks that no package except `content` calls `mergePlugins`
directly.

### D2 — SvelteKit uses the shared config loader

`packages/sveltekit/src/config.ts` and its test are deleted, and the plugin calls
`loadRefraktConfig` from `@refrakt-md/transform/node`. The checks that are still meaningful for
the canonical shape move into `validate-config.ts`, where `refrakt validate` already reports
config problems for every adapter. The ones that only exist for the flat shape go away with it at
v1.0.

### D3 — shared adapter helpers live in `@refrakt-md/transform/node`

- `createUsedBlocksResolver(opts)` replaces the four `getUsedBlocks` copies.
- `createContentHmrVitePlugin(site, root, configDir)` replaces the Astro and Nuxt copies and reads
  `sandbox.dir` only.
- `loadRefraktConfigWithRaw` becomes the primitive and `loadRefraktConfig` calls it.

### D4 — behaviour bootstrapping is one export

`@refrakt-md/behaviors` exports `initPageBehaviors(ctx, root?)`, `hasInteractiveRunes` and the
`PageEntry` type. Each adapter's client entry shrinks to a call.

## Not in scope

- **CLI argument parsing.** `bin.ts` is 2,051 lines with 31 hand-written `run*` functions and 131
  `process.exit` calls; moving to `node:util` `parseArgs` and a command table would save more lines
  than this whole spec and let `site/content/docs/cli/cli-overview.md`'s command table be generated
  from `printUsage`. It's a larger change with its own risk (every flag's behaviour), so it deserves
  its own spec once D1 has thinned `bin.ts`.
- **A generic `FrameworkTheme<C>`** for `ReactTheme`/`VueTheme`/`SvelteTheme`. About 30 lines; not
  worth an API change.

## Acceptance Criteria

- [ ] `resolveSiteRunes()` exists in `@refrakt-md/content` and includes the theme-config fallback
- [ ] SvelteKit, every CLI command, `refrakt edit`, the language server and the html template use it, and `loadMergedConfig` and `buildReferenceContext` are deleted
- [ ] A test fails if a package other than `content` calls `mergePlugins` directly
- [ ] `packages/sveltekit/src/config.ts` and its test are deleted, and any still-meaningful check lives in `validate-config.ts`
- [ ] Astro, Nuxt, Next and Eleventy share `createUsedBlocksResolver` and (where they use Vite) `createContentHmrVitePlugin`, and no adapter reads `sandbox.examplesDir`
- [ ] `initPageBehaviors`, `hasInteractiveRunes` and `PageEntry` are exported from `@refrakt-md/behaviors` and used by every adapter's client entry

## References

- {% ref "ADR-022" /%}: `sandbox.dir`, the field the adapters should read.
- {% ref "SPEC-192" /%}: the packaging cleanup for the language server, which D1 also touches.

{% /spec %}
