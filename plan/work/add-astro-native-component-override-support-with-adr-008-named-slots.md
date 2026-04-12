{% work id="WORK-125" status="done" priority="medium" complexity="complex" tags="astro, renderer, architecture" source="ADR-008,ADR-009" %}

# Add Astro native component override support with ADR-008 named slots

Astro is a special case per ADR-008: it is both an adapter (routing, build integration) and has its own component format with native named slots. Unlike Next.js and Nuxt which need separate renderer packages (`@refrakt-md/react`, `@refrakt-md/vue`), Astro component overrides can be handled directly in `packages/astro/` using Astro's built-in `<slot name="...">` mechanism.

For interactive runes rendered inside Astro islands, the island's framework renderer (React, Svelte, or Vue) handles extraction — that is covered by WORK-123, WORK-124, and WORK-119 respectively. This work item covers **static `.astro` component overrides** only.

## Acceptance Criteria
- [x] `packages/astro/` supports registering `.astro` component overrides keyed by `typeof` name
- [x] Renderer dispatches on `typeof` attribute to select registered `.astro` component overrides (falls back to identity-transformed HTML)
- [x] Uses `extractComponentInterface` from `@refrakt-md/transform` to partition children
- [x] Property values passed as Astro props (`Astro.props.prepTime`, etc.)
- [x] Top-level refs passed as Astro named slots (`<slot name="headline" />`, `<slot name="ingredients" />`)
- [x] Original `tag` object passed as prop alongside extracted props (hybrid per ADR-008 Option 4)
- [x] Component registry mechanism added to `@refrakt-md/astro` (e.g., `registry.ts`)
- [x] Integration hook wires up the registry so components are available at render time
- [x] TypeScript compiles cleanly
- [x] Test suite covers extraction, dispatch, and fallback rendering

## Approach

Unlike React/Vue renderers which are recursive components, the Astro renderer operates at build time during SSR. The approach is:

1. **Component registry** — export a `registry` map of `typeof` name → `.astro` component, similar to `@refrakt-md/svelte`'s registry
2. **Render phase** — when rendering a node with a `typeof` that matches a registered component, use `extractComponentInterface` to partition children, then render the `.astro` component with props and named slots
3. **Fallback** — unregistered runes render via identity-transformed HTML as today

Astro's native named slots make this particularly clean:
```astro
---
const { prepTime, difficulty } = Astro.props;
---
<article class="my-recipe">
  <slot name="headline" />
  <slot name="ingredients" />
  <slot name="steps" />
</article>
```

The main complexity is integrating the component dispatch into Astro's rendering pipeline, which differs from Svelte/React/Vue's recursive component model.

## References
- {% ref "ADR-008" /%} — Framework-native component interface for rune overrides (see Astro special case in Consequences)
- {% ref "WORK-117" /%} — Framework-agnostic extraction logic (done)
- {% ref "WORK-119" /%} — Svelte renderer extraction (done, reference implementation)
- {% ref "WORK-123" /%} — React renderer (for island components)
- {% ref "WORK-124" /%} — Vue renderer (for island components)
- `packages/astro/` — Astro adapter (this package gets the additions)

## Resolution

Completed: 2026-04-06

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- `RfRenderer.astro` — recursive Astro component that dispatches on `data-rune` to registered component overrides
- Component overrides receive extracted properties as Astro props, named refs as native Astro named slots (`<Fragment slot="name" set:html={html} />`), anonymous children as default slot, and original `tag` as escape-hatch prop
- Element overrides: `Table.astro` (scrollable wrapper) and `Pre.astro` (rf-codeblock structure)
- `registry.ts` — ComponentRegistry type + empty default, exported from index.ts
- Package.json exports for `./RfRenderer.astro` and `./elements/*.astro`
- Removed stale `themeAdapter` reference from integration hook (per ADR-009)
- 8 tests covering registry, extraction pipeline, and dispatch logic

### Notes
- `.astro` components shipped as source (not compiled), matching the existing `BaseLayout.astro` pattern
- Actual Astro component rendering can't be tested in vitest — tests cover the TypeScript extraction pipeline that `RfRenderer.astro` depends on
- For interactive runes in Astro islands, the island's framework renderer (React/Vue/Svelte) handles extraction per WORK-123/124/119

{% /work %}
