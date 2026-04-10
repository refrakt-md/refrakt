{% work id="WORK-123" status="done" priority="medium" complexity="complex" tags="react, renderer, architecture" source="ADR-008" %}

# Create @refrakt-md/react renderer with ADR-008 component interface

The Next.js adapter currently renders all runes via `renderToHtml()` (identity transform only). To support React component overrides — where theme or site authors provide custom React components for specific runes — we need a `@refrakt-md/react` renderer package that dispatches on `typeof`/`data-rune` and provides the ADR-008 framework-native interface (props + named children).

## Acceptance Criteria
- [x] New `packages/react/` package exists with `@refrakt-md/react` name
- [x] Exports a `Renderer` component that recursively renders a `RendererNode` tree
- [x] Renderer dispatches on `typeof` attribute to select registered component overrides (falls back to generic HTML element)
- [x] Uses `extractComponentInterface` from `@refrakt-md/transform` to partition children into properties, refs, and anonymous content
- [x] Property values passed as named React props to component overrides
- [x] Top-level refs passed as render props or named children (React idiom for named slots)
- [x] Original `tag` object passed as prop alongside extracted props (hybrid per ADR-008 Option 4)
- [x] Exports a component registry mechanism (similar to `@refrakt-md/svelte`'s registry)
- [x] Exports an `elements` override mechanism for HTML element-level overrides (Table, Pre, etc.)
- [x] Next.js adapter can use the React renderer instead of `renderToHtml()` for pages with component overrides
- [x] TypeScript compiles cleanly
- [x] Test suite covers extraction, dispatch, and fallback rendering

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

## Resolution

Completed: 2026-04-06

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- Created `packages/react/` with full ADR-008 component interface
- `Renderer.tsx` — recursive React component dispatching on `data-rune` to registered components
- Properties extracted as named React props, refs as ReactNode (pre-rendered HTML via dangerouslySetInnerHTML)
- Element overrides: Table (scrollable wrapper), Pre (rf-codeblock structure for behaviors)
- Props passed explicitly (no React Context) for Server Component compatibility
- Registry + elements + ReactTheme type exports
- 21 tests covering dispatch, extraction, overrides, and edge cases
- Updated RefraktContent docs to reference @refrakt-md/react for component override mode
- Fixed adapter package version drift (0.9.0 → 0.9.1) for astro/nuxt/next/eleventy

### Notes
- Named refs are rendered to HTML via `renderToHtml` and wrapped in `<div data-ref="name">` with `dangerouslySetInnerHTML`, matching the Svelte renderer's `createRawSnippet` approach
- No React Context used — registry and elements are prop-drilled through the Renderer, ensuring compatibility with Next.js Server Components
- RefraktContent continues to use renderToHtml for layout-aware rendering; the React Renderer is an alternative for content-level rendering with component overrides

{% /work %}
