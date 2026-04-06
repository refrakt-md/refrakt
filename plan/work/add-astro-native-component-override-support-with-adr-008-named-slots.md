{% work id="WORK-125" status="draft" priority="medium" complexity="complex" tags="astro, renderer, architecture" %}

# Add Astro native component override support with ADR-008 named slots

Astro is a special case per ADR-008: it is both an adapter (routing, build integration) and has its own component format with native named slots. Unlike Next.js and Nuxt which need separate renderer packages (`@refrakt-md/react`, `@refrakt-md/vue`), Astro component overrides can be handled directly in `packages/astro/` using Astro's built-in `<slot name="...">` mechanism.

For interactive runes rendered inside Astro islands, the island's framework renderer (React, Svelte, or Vue) handles extraction — that is covered by WORK-123, WORK-124, and WORK-119 respectively. This work item covers **static `.astro` component overrides** only.

## Acceptance Criteria
- [ ] `packages/astro/` supports registering `.astro` component overrides keyed by `typeof` name
- [ ] Renderer dispatches on `typeof` attribute to select registered `.astro` component overrides (falls back to identity-transformed HTML)
- [ ] Uses `extractComponentInterface` from `@refrakt-md/transform` to partition children
- [ ] Property values passed as Astro props (`Astro.props.prepTime`, etc.)
- [ ] Top-level refs passed as Astro named slots (`<slot name="headline" />`, `<slot name="ingredients" />`)
- [ ] Original `tag` object passed as prop alongside extracted props (hybrid per ADR-008 Option 4)
- [ ] Component registry mechanism added to `@refrakt-md/astro` (e.g., `registry.ts`)
- [ ] Integration hook wires up the registry so components are available at render time
- [ ] TypeScript compiles cleanly
- [ ] Test suite covers extraction, dispatch, and fallback rendering

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
- ADR-008 — Framework-native component interface for rune overrides (see Astro special case in Consequences)
- WORK-117 — Framework-agnostic extraction logic (done)
- WORK-119 — Svelte renderer extraction (done, reference implementation)
- WORK-123 — React renderer (for island components)
- WORK-124 — Vue renderer (for island components)
- `packages/astro/` — Astro adapter (this package gets the additions)

{% /work %}
