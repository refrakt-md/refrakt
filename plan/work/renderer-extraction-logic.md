{% work id="WORK-117" status="done" priority="high" complexity="moderate" tags="transform, renderer, architecture" milestone="v1.0.0" %}

# Implement framework-agnostic extraction logic for component interface

> Ref: ADR-008 (Framework-native component interface for rune overrides)

## Summary

Add a shared extraction utility that partitions a serialized tag's children into three categories: properties (meta tags with `property` attribute), named refs (top-level children with `data-name` attribute), and anonymous content (everything else). This utility is framework-agnostic and will be consumed by each framework's renderer.

## Acceptance Criteria

- [x] New `extractComponentInterface(tag)` function in `packages/transform/src/helpers.ts` (or new file)
- [x] Returns `{ properties: Record<string, string>, refs: Record<string, SerializedTag[]>, children: RenderableTreeNode[] }`
- [x] Properties extracted from children where `attributes.property` is set, keyed by property name, value from `attributes.content`
- [x] Refs extracted from top-level children where `attributes['data-name']` is set, keyed by data-name value
- [x] Nested refs (children inside other refs) are NOT extracted — they stay inside their parent ref
- [x] Remaining children (neither property nor named ref) returned as anonymous content
- [x] Unit tests covering: basic extraction, nested refs stay nested, empty cases, mixed children

## Approach

1. Add extraction function to `packages/transform`
2. Iterate children once, partitioning into three buckets based on attributes
3. Export for use by framework renderers


## Resolution

Completed: 2026-04-04

Branch: `claude/adr-008-implementation-nBN9K`

### What was done
- Added `extractComponentInterface()` and `fromKebabCase()` to `packages/transform/src/helpers.ts`
- Added `ComponentInterface` type export
- Exported new functions from `packages/transform/src/index.ts`
- 11 unit tests in `packages/transform/test/extract-interface.test.ts`

### Notes
- Uses `data-field` attribute on meta tags (not `property`) since that's what `createComponentRenderable` actually produces
- Returns camelCase keys from kebab-case `data-field` values via `fromKebabCase`
