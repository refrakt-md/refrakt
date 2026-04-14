{% work id="WORK-146" status="done" priority="high" complexity="moderate" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract relationship builder into relationships module

Extract the relationship graph construction logic (~120 lines) from `pipeline.ts`'s aggregate hook into a new `relationships.ts` module with zero Node.js imports.

## Acceptance Criteria

- [x] New file `runes/plan/src/relationships.ts` exists
- [x] `relationships.ts` has zero imports from `node:fs`, `node:path`, or `node:child_process`
- [x] `buildRelationships()` function is exported and produces a `Map<string, EntityRelationship[]>`
- [x] `EntityRelationship` interface is exported with all relationship kinds: `blocks`, `blocked-by`, `depends-on`, `dependency-of`, `implements`, `implemented-by`, `informs`, `informed-by`, `related`
- [x] Source references produce `implements`/`implemented-by` edges (or `informs`/`informed-by` for decisions)
- [x] Scanner dependencies produce `depends-on`/`dependency-of` edges
- [x] ID references produce `related` edges (or `blocked-by`/`blocks` when entity status is `blocked`)
- [x] Duplicate edge suppression works: source-linked and dep-linked pairs are excluded from text-based ID reference edges
- [x] Pipeline's aggregate hook calls `buildRelationships()` instead of inlining the logic
- [x] All existing relationship behaviour is preserved — same edges, same directions, same deduplication
- [x] Existing tests pass without modification

## Approach

1. Create `relationships.ts`. Define the `EntityRelationship` interface (currently inline in `pipeline.ts`). Move the `addRel` helper function and the three reference-processing loops (source refs, scanner deps, ID refs) into a `buildRelationships()` function.
2. The function accepts the same data the aggregate hook currently uses: an entity map, source references, scanner dependencies, and ID references. The entity map uses a minimal shape (`{ type: string; data: Record<string, any> }`) rather than requiring the full `EntityRegistration` type, to keep the module self-contained.
3. In `pipeline.ts`, import `buildRelationships` and call it from the aggregate hook, passing the existing `allEntities`, `_sourceReferences`, `_scannerDependencies`, and `_idReferences` maps.
4. Remove the `EntityRelationship` interface definition from `pipeline.ts` — import it from `relationships.ts` instead.
5. Run existing tests to confirm no regressions.

## Dependencies

None — independent of the scanner and diff extractions.

## References

- {% ref "SPEC-040" /%} — Edge Runtime Compatibility for Plan Package

## Resolution

Completed: 2026-04-14

Branch: `claude/edge-runtime-refactor-HOg8v`

### What was done
- Created `runes/plan/src/relationships.ts` with `buildRelationships()` function and `EntityRelationship` interface
- Defined `RelationshipEntity` minimal interface so the module doesn't depend on @refrakt-md/types
- Pipeline's aggregate hook now calls buildRelationships() with allEntities, _sourceReferences, _scannerDependencies, _idReferences
- Removed inline EntityRelationship interface from pipeline.ts; re-exports from relationships.ts for backwards compatibility

### Notes
- relationships.ts has zero external dependencies — pure TypeScript only
- All 10 relationship-related tests pass (implements, informed-by, blocks, deduplication)

{% /work %}
