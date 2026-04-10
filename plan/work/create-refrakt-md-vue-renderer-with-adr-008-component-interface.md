{% work id="WORK-124" status="done" priority="medium" complexity="complex" tags="vue, renderer, architecture" source="ADR-008" %}

# Create @refrakt-md/vue renderer with ADR-008 component interface

The Nuxt adapter currently renders all runes via `renderToHtml()` (identity transform only). To support Vue component overrides — where theme or site authors provide custom Vue components for specific runes — we need a `@refrakt-md/vue` renderer package that dispatches on `typeof`/`data-rune` and provides the ADR-008 framework-native interface (props + named slots).

## Acceptance Criteria
- [x] New `packages/vue/` package exists with `@refrakt-md/vue` name
- [x] Exports a `Renderer` component that recursively renders a `RendererNode` tree
- [x] Renderer dispatches on `typeof` attribute to select registered component overrides (falls back to generic HTML element)
- [x] Uses `extractComponentInterface` from `@refrakt-md/transform` to partition children into properties, refs, and anonymous content
- [x] Property values passed as named Vue props to component overrides
- [x] Top-level refs passed as Vue named slots
- [x] Original `tag` object passed as prop alongside extracted props (hybrid per ADR-008 Option 4)
- [x] Exports a component registry mechanism (similar to `@refrakt-md/svelte`'s registry)
- [x] Exports an `elements` override mechanism for HTML element-level overrides (Table, Pre, etc.)
- [x] Nuxt adapter can use the Vue renderer instead of `renderToHtml()` for pages with component overrides
- [x] TypeScript compiles cleanly
- [x] Test suite covers extraction, dispatch, and fallback rendering

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

## Resolution

Completed: 2026-04-06

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- Created `packages/vue/` with full ADR-008 component interface
- `Renderer.ts` — Vue 3 `defineComponent` using `h()` render function for recursive tree rendering
- Component overrides dispatched via data-rune, receiving:
  - Properties as named Vue props
  - Named refs as Vue named slots (pre-rendered HTML via innerHTML)
  - Anonymous children as default slot
  - Original tag as escape-hatch prop
- Element overrides: Table (scrollable wrapper), Pre (rf-codeblock structure)
- Registry + elements + VueTheme type exports
- 20 tests using `@vue/server-renderer` SSR rendering

### Notes
- Used `defineComponent` + `h()` render functions instead of `.vue` SFC to avoid needing vue-tsc/vite in the build
- Named slots use Vue's native slot mechanism: `h(Component, props, { slotName: () => vnode })`
- All 2022 tests pass (20 new)

{% /work %}
