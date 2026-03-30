{% work id="WORK-058" status="ready" priority="low" complexity="complex" tags="pipeline, content, performance" milestone="v1.0.0" %}

# Pipeline Incremental Build Optimization

> Ref: SPEC-002 (Cross-Page Pipeline — Performance Considerations)

## Summary

The full five-phase pipeline runs on every build. For large sites this can be slow. Incremental builds optimise by tracking which pages have changed and which entities are affected, selectively re-running only the necessary work.

This is a performance optimization — the pipeline already produces correct results. This work item makes it faster for large projects (100+ pages).

## Acceptance Criteria

- [ ] Phase 1 (Parse): only re-parses changed files; caches transformed ASTs for unchanged pages
- [ ] Phase 2 (Register): only re-registers entities from changed pages; merges with cached entities from unchanged pages
- [ ] Phase 3 (Aggregate): re-runs fully when any entity changes (aggregation depends on complete registry)
- [ ] Phase 4 (Post-process): only re-processes pages whose content changed OR whose cross-page dependencies changed
- [ ] Phase 5 (Render): only re-renders pages whose enriched AST changed
- [ ] Dependency tracking: the pipeline knows which entity types/names each page's post-processing reads, so it can determine which pages need re-processing when an entity changes
- [ ] Cache invalidation is correct — changing a character name triggers re-processing of all pages that reference that character
- [ ] Full rebuild produces identical output to incremental rebuild (correctness invariant)
- [ ] Measurable speedup on a 200-page project with single-file edits (target: >5x faster than full rebuild)

## Approach

**Change detection:** Use file modification timestamps or content hashes to identify changed files between builds. Store the previous build's entity registry and per-page AST hashes.

**Dependency graph:** During Phase 4, track which registry queries each post-processing hook makes (entity types and names accessed). Store this as a dependency map: `page → Set<entityType:entityName>`. On next build, if any dependency changed, that page needs re-processing.

**Cache storage:** Store cached ASTs, entity registrations, and dependency maps in a `.refrakt/cache/` directory (or in-memory for dev server). Include a cache version to invalidate on pipeline code changes.

**Aggregation shortcut:** If no entities changed between builds, skip Phase 3 entirely and reuse the previous aggregated data.

## References

- SPEC-002 (Cross-Page Pipeline — Performance Considerations, Incremental Builds)

{% /work %}
