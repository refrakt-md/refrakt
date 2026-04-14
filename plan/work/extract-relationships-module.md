{% work id="WORK-146" status="ready" priority="high" complexity="moderate" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract relationship builder into relationships module

Extract the relationship graph construction logic (~120 lines) from `pipeline.ts`'s aggregate hook into a new `relationships.ts` module with zero Node.js imports.

## Acceptance Criteria

- [ ] New file `runes/plan/src/relationships.ts` exists
- [ ] `relationships.ts` has zero imports from `node:fs`, `node:path`, or `node:child_process`
- [ ] `buildRelationships()` function is exported and produces a `Map<string, EntityRelationship[]>`
- [ ] `EntityRelationship` interface is exported with all relationship kinds: `blocks`, `blocked-by`, `depends-on`, `dependency-of`, `implements`, `implemented-by`, `informs`, `informed-by`, `related`
- [ ] Source references produce `implements`/`implemented-by` edges (or `informs`/`informed-by` for decisions)
- [ ] Scanner dependencies produce `depends-on`/`dependency-of` edges
- [ ] ID references produce `related` edges (or `blocked-by`/`blocks` when entity status is `blocked`)
- [ ] Duplicate edge suppression works: source-linked and dep-linked pairs are excluded from text-based ID reference edges
- [ ] Pipeline's aggregate hook calls `buildRelationships()` instead of inlining the logic
- [ ] All existing relationship behaviour is preserved — same edges, same directions, same deduplication
- [ ] Existing tests pass without modification

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

{% /work %}
