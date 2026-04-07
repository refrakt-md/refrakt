{% work id="WORK-090" status="done" priority="medium" complexity="moderate" tags="frameworks, nuxt" milestone="v1.0.0" %}

# Create @refrakt-md/nuxt adapter package

Build the Nuxt framework adapter. Nuxt is Vite-based like SvelteKit, so the existing Vite plugin logic (virtual modules, content HMR) can be substantially reused.

## Acceptance Criteria

- [ ] `packages/nuxt/` package exists with correct `package.json` (peer dep `nuxt@^3.0.0`)
- [ ] Nuxt module (`module.ts`) registers Vite plugin, injects CSS, configures `build.transpile`, sets Vue `isCustomElement` for `rf-*` tags
- [ ] Adapted Vite plugin reuses virtual module and content HMR logic from SvelteKit plugin
- [ ] `RefraktContent.vue` renders page tree via `renderToHtml()` + `v-html`
- [ ] `useRefraktMeta()` composable maps page SEO data to Nuxt's `useHead()` (OG tags, JSON-LD)
- [ ] Catch-all route `pages/[...slug].vue` loads content via `useAsyncData()` + `loadContent()`
- [ ] Behavior init/cleanup handled via `onMounted`/`onBeforeUnmount`, re-init on route change via watcher
- [ ] Lumina Nuxt adapter exports theme config + CSS entry point
- [ ] Example site renders core runes, layouts, behaviors, and web components correctly
- [ ] Adapter documentation page at `site/content/docs/adapters/nuxt.md` with installation, project structure, configuration, code examples (Nuxt module setup, RefraktContent usage, useRefraktMeta composable, route setup, behavior lifecycle, SEO injection), and getting-started guide matching the depth of existing SvelteKit adapter docs

## Approach

Build a Nuxt module via `defineNuxtModule` that wraps an adapted version of the SvelteKit Vite plugin. The main adaptation is changing virtual module import paths from `lumina/svelte` to `lumina/nuxt`. Content HMR reuses the same `server.watcher` pattern. The `RefraktContent.vue` component is trivial — just `renderToHtml()` + `v-html`.

The SvelteKit plugin's `CORE_NO_EXTERNAL` list maps directly to `nuxt.options.build.transpile`.

## Dependencies

- WORK-088 (shared utility extraction)

## References

- SPEC-030 (Phase 2)
- ADR-002 (Nuxt section)

## Resolution

Completed: 2026-04-04

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- Created `packages/nuxt/` with Nuxt module, renderPage, buildRefraktHead composable, hasInteractiveRunes
- Lumina Nuxt adapter at `packages/lumina/nuxt/index.ts`
- Docs page at `site/content/docs/adapters/nuxt.md`

### Notes
- Uses defineNuxtModule with builder:watch for HMR and builder:generateApp for rebuild
- Vue custom element config for rf-* tags handled in module setup
- hasInteractiveRunes uses getBehaviorNames() from @refrakt-md/behaviors registry

{% /work %}
