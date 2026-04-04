{% work id="WORK-119" status="ready" priority="high" complexity="high" tags="svelte, renderer, architecture" milestone="v1.0.0" %}

# Update Svelte renderer to pass props and snippets to component overrides

> Ref: ADR-008 (Framework-native component interface for rune overrides)

Depends on: WORK-117 (extraction logic)

## Summary

Update the Svelte 5 Renderer to use the extraction utility from WORK-100 when dispatching to a registered component override. Properties become scalar props, top-level refs become Svelte 5 snippets, anonymous content becomes the `children` snippet, and the original `tag` object is passed alongside as an escape hatch.

## Acceptance Criteria

- [ ] Renderer calls `extractComponentInterface` before dispatching to registered components
- [ ] Property values passed as named props (e.g., `prepTime="15 min"`)
- [ ] Top-level refs passed as Svelte 5 snippets (using `createRawSnippet` or equivalent)
- [ ] Anonymous content passed as `children` snippet
- [ ] Original `tag` prop still passed alongside for backwards compatibility
- [ ] Existing element overrides (Table, Pre) continue to work unchanged
- [ ] Snippets contain identity-transformed content (BEM classes, structure intact)
- [ ] Integration test: mock component receives correct props, snippets, and tag

## Approach

1. In the component dispatch branch of `Renderer.svelte`, call extraction utility
2. Construct snippet functions for each ref using Svelte 5's programmatic snippet API
3. Spread extracted properties + snippets + `tag` as props to the component
4. Test with an example rune component override
