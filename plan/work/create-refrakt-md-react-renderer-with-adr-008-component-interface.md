{% work id="WORK-123" status="draft" priority="medium" complexity="complex" tags="react, renderer, architecture" %}

# Create @refrakt-md/react renderer with ADR-008 component interface

The Next.js adapter currently renders all runes via `renderToHtml()` (identity transform only). To support React component overrides — where theme or site authors provide custom React components for specific runes — we need a `@refrakt-md/react` renderer package that dispatches on `typeof`/`data-rune` and provides the ADR-008 framework-native interface (props + named children).

## Acceptance Criteria
- [ ] New `packages/react/` package exists with `@refrakt-md/react` name
- [ ] Exports a `Renderer` component that recursively renders a `RendererNode` tree
- [ ] Renderer dispatches on `typeof` attribute to select registered component overrides (falls back to generic HTML element)
- [ ] Uses `extractComponentInterface` from `@refrakt-md/transform` to partition children into properties, refs, and anonymous content
- [ ] Property values passed as named React props to component overrides
- [ ] Top-level refs passed as render props or named children (React idiom for named slots)
- [ ] Original `tag` object passed as prop alongside extracted props (hybrid per ADR-008 Option 4)
- [ ] Exports a component registry mechanism (similar to `@refrakt-md/svelte`'s registry)
- [ ] Exports an `elements` override mechanism for HTML element-level overrides (Table, Pre, etc.)
- [ ] Next.js adapter can use the React renderer instead of `renderToHtml()` for pages with component overrides
- [ ] TypeScript compiles cleanly
- [ ] Test suite covers extraction, dispatch, and fallback rendering

## Approach

Mirror the architecture of `@refrakt-md/svelte`:
- `Renderer.tsx` — recursive component that walks the renderable tree
- `registry.ts` — `typeof` name → React component mapping
- `elements.ts` — HTML element name → React component mapping (for Table, Pre, etc.)
- `theme.ts` — `ReactTheme` interface (manifest + layouts + components + elements)

For named slots, React doesn't have a native slot mechanism. The idiomatic approach is either:
- **Named children as props**: `<Recipe headline={<div>...</div>} ingredients={<div>...</div>} />`
- **Render props**: `headline={() => <div>...</div>}`

Named children as props (ReactNode values) is the most natural React pattern and aligns with how libraries like Radix and Headless UI handle named content regions.

The extraction logic is already framework-agnostic (`extractComponentInterface` in `@refrakt-md/transform`). The React-specific work is:
1. Converting extracted refs into pre-rendered `ReactNode` values
2. Passing them alongside scalar props to the component
3. Recursive rendering of the tree (handling both component and HTML element nodes)

## References
- ADR-008 — Framework-native component interface for rune overrides
- WORK-117 — Framework-agnostic extraction logic (done)
- WORK-119 — Svelte renderer extraction (done, reference implementation)
- `packages/svelte/src/Renderer.svelte` — Svelte renderer (reference)
- `packages/svelte/src/registry.ts` — Svelte component registry (reference)
- `packages/next/` — Next.js adapter (consumer of this package)

{% /work %}
