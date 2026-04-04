{% work id="WORK-117" status="ready" priority="high" complexity="moderate" tags="transform, renderer, architecture" %}

# Implement framework-agnostic extraction logic for component interface

> Ref: ADR-008 (Framework-native component interface for rune overrides)

## Summary

Add a shared extraction utility that partitions a serialized tag's children into three categories: properties (meta tags with `property` attribute), named refs (top-level children with `data-name` attribute), and anonymous content (everything else). This utility is framework-agnostic and will be consumed by each framework's renderer.

## Acceptance Criteria

- [ ] New `extractComponentInterface(tag)` function in `packages/transform/src/helpers.ts` (or new file)
- [ ] Returns `{ properties: Record<string, string>, refs: Record<string, SerializedTag[]>, children: RenderableTreeNode[] }`
- [ ] Properties extracted from children where `attributes.property` is set, keyed by property name, value from `attributes.content`
- [ ] Refs extracted from top-level children where `attributes['data-name']` is set, keyed by data-name value
- [ ] Nested refs (children inside other refs) are NOT extracted — they stay inside their parent ref
- [ ] Remaining children (neither property nor named ref) returned as anonymous content
- [ ] Unit tests covering: basic extraction, nested refs stay nested, empty cases, mixed children

## Approach

1. Add extraction function to `packages/transform`
2. Iterate children once, partitioning into three buckets based on attributes
3. Export for use by framework renderers
