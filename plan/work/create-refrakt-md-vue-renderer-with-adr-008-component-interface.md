{% work id="WORK-124" status="draft" priority="medium" complexity="complex" tags="vue, renderer, architecture" %}

# Create @refrakt-md/vue renderer with ADR-008 component interface

The Nuxt adapter currently renders all runes via `renderToHtml()` (identity transform only). To support Vue component overrides — where theme or site authors provide custom Vue components for specific runes — we need a `@refrakt-md/vue` renderer package that dispatches on `typeof`/`data-rune` and provides the ADR-008 framework-native interface (props + named slots).

## Acceptance Criteria
- [ ] New `packages/vue/` package exists with `@refrakt-md/vue` name
- [ ] Exports a `Renderer` component that recursively renders a `RendererNode` tree
- [ ] Renderer dispatches on `typeof` attribute to select registered component overrides (falls back to generic HTML element)
- [ ] Uses `extractComponentInterface` from `@refrakt-md/transform` to partition children into properties, refs, and anonymous content
- [ ] Property values passed as named Vue props to component overrides
- [ ] Top-level refs passed as Vue named slots
- [ ] Original `tag` object passed as prop alongside extracted props (hybrid per ADR-008 Option 4)
- [ ] Exports a component registry mechanism (similar to `@refrakt-md/svelte`'s registry)
- [ ] Exports an `elements` override mechanism for HTML element-level overrides (Table, Pre, etc.)
- [ ] Nuxt adapter can use the Vue renderer instead of `renderToHtml()` for pages with component overrides
- [ ] TypeScript compiles cleanly
- [ ] Test suite covers extraction, dispatch, and fallback rendering

## Approach

Mirror the architecture of `@refrakt-md/svelte`:
- `Renderer.vue` — recursive component that walks the renderable tree
- `registry.ts` — `typeof` name → Vue component mapping
- `elements.ts` — HTML element name → Vue component mapping (for Table, Pre, etc.)
- `theme.ts` — `VueTheme` interface (manifest + layouts + components + elements)

Vue has native named slots, making it the most natural fit after Svelte. The renderer uses `<component :is>` for dynamic dispatch with `v-bind` for props and `<template #name>` for named slot content.

The extraction logic is already framework-agnostic (`extractComponentInterface` in `@refrakt-md/transform`). The Vue-specific work is:
1. Converting extracted refs into named slot content via Vue's `<template #name>` syntax
2. Passing scalar props via `v-bind`
3. Recursive rendering with `<component :is>` for dynamic dispatch

## References
- ADR-008 — Framework-native component interface for rune overrides
- WORK-117 — Framework-agnostic extraction logic (done)
- WORK-119 — Svelte renderer extraction (done, reference implementation)
- `packages/svelte/src/Renderer.svelte` — Svelte renderer (reference)
- `packages/nuxt/` — Nuxt adapter (consumer of this package)

{% /work %}
