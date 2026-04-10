{% work id="WORK-119" status="done" priority="high" complexity="high" tags="svelte, renderer, architecture" milestone="v1.0.0" source="ADR-008" %}

# Update Svelte renderer to pass props and snippets to component overrides

> Ref: ADR-008 (Framework-native component interface for rune overrides)

Depends on: WORK-117 (extraction logic)

## Summary

Update the Svelte 5 Renderer to use the extraction utility from WORK-100 when dispatching to a registered component override. Properties become scalar props, top-level refs become Svelte 5 snippets, anonymous content becomes the `children` snippet, and the original `tag` object is passed alongside as an escape hatch.

## Acceptance Criteria

- [x] Renderer calls `extractComponentInterface` before dispatching to registered components
- [x] Property values passed as named props (e.g., `prepTime="15 min"`)
- [x] Top-level refs passed as Svelte 5 snippets (using `createRawSnippet` or equivalent)
- [x] Anonymous content passed as `children` snippet
- [x] Original `tag` prop still passed alongside for backwards compatibility
- [x] Existing element overrides (Table, Pre) continue to work unchanged
- [x] Snippets contain identity-transformed content (BEM classes, structure intact)
- [x] Integration test: mock component receives correct props, snippets, and tag

## Approach

1. In the component dispatch branch of `Renderer.svelte`, call extraction utility
2. Construct snippet functions for each ref using Svelte 5's programmatic snippet API
3. Spread extracted properties + snippets + `tag` as props to the component
4. Test with an example rune component override


## Resolution

Completed: 2026-04-04

Branch: `claude/adr-008-implementation-nBN9K`

### What was done
- Updated `packages/svelte/src/Renderer.svelte` with extraction and snippet creation
- Added `nodeToHtml()` for HTML serialization with codeblock/raw-html support
- Used `createRawSnippet` for ref and children snippets
- Spread extracted properties and snippet props to Component, with `tag` alongside
- 6 integration tests in `packages/svelte/test/renderer-extraction.test.ts`

### Notes
- Snippets render static HTML via createRawSnippet (sufficient for identity-transformed content)
- Element overrides unchanged (extraction only applies to Component dispatch path)
- VOID_ELEMENTS set added to Renderer for proper void element handling in HTML output
