{% work id="WORK-059" status="done" priority="high" complexity="moderate" tags="transform, themes, metadata" milestone="v0.9.0" %}

# Metadata Dimensions on StructureEntry

> Ref: SPEC-024 (Metadata System — Extending StructureEntry, Identity Transform)

## Summary

Add three semantic metadata fields to the `StructureEntry` interface: `metaType`, `metaRank`, and `sentimentMap`. The identity transform reads these from rune configs and emits `data-meta-type`, `data-meta-rank`, and `data-meta-sentiment` attributes on generated badge elements. This is the foundation that enables themes to style every metadata badge generically with ~18 CSS rules.

## Acceptance Criteria

- [x] `StructureEntry` in `packages/transform/src/types.ts` gains `metaType`, `metaRank`, and `sentimentMap` optional fields
- [x] Identity transform engine emits `data-meta-type` when `metaType` is present on a structure entry child
- [x] Identity transform engine emits `data-meta-rank` when `metaRank` is present
- [x] Identity transform engine resolves sentiment by looking up the current modifier value in `sentimentMap`, emitting `data-meta-sentiment` when a match exists
- [x] Existing structure entries without metadata fields continue to work unchanged (backwards compatible)
- [x] `refrakt inspect` output shows the new data attributes on badge elements
- [x] Unit tests in `packages/transform/test/` verify metadata attribute emission for: status with sentiment, category without sentiment, temporal, quantity, tag, and id types

## Approach

1. Extend `StructureEntry` interface in `packages/transform/src/types.ts` with the three optional fields
2. In `packages/transform/src/engine.ts`, in the code path that processes structure entry children, add logic to: read `metaType` and emit `data-meta-type`, read `metaRank` and emit `data-meta-rank`, look up the current modifier value in `sentimentMap` and emit `data-meta-sentiment` if found
3. The existing `data-{modifier-name}` attributes continue to be emitted as before — metadata attributes are additive

## References

- SPEC-024 (Metadata System — Extending StructureEntry, Identity Transform)

{% /work %}
