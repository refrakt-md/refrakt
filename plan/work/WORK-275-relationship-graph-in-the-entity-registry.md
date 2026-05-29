{% work id="WORK-275" status="done" priority="high" complexity="moderate" source="SPEC-072" tags="registry,relationships,pipeline" milestone="v0.16.0" %}

# Relationship graph in the entity registry

Add a directed, typed relationship graph to the core `EntityRegistry` so any plugin can contribute edges and any consumer can query them. Today relationships exist only as private maps inside the plan plugin's aggregate hook; this lifts the capability into the framework (the registry has no edge concept today — `packages/types/src/pipeline.ts`).

## Acceptance Criteria
- [x] An `EntityEdge { fromId, toId, kind: string, fromType?, toType? }` type is defined in `@refrakt-md/types`; `kind` is an arbitrary string, not a union.
- [x] `EntityRegistry` gains `relate(edge)` and `getRelated(id, opts?)` where `opts` filters by `kind` (string | string[]) and target `type` (string | string[]).
- [x] `getRelated(id)` returns the edges whose `fromId === id`, each with its resolved target `EntityRegistration`.
- [x] Core dedupes exact `(fromId, toId, kind)` duplicates; richer precedence is left to contributors.
- [x] `relate()` is callable during the aggregate phase; `EntityRegistryImpl` (`packages/content/src/registry.ts`) implements it.
- [x] Unit tests cover directed edges, kind/type filtering, dedup, and unknown-id handling.

## Approach
Extend the `EntityRegistry` interface in `packages/types/src/pipeline.ts` and implement in `packages/content/src/registry.ts` (`EntityRegistryImpl`). Store edges in an adjacency map keyed by `fromId`. `getRelated` resolves each edge's `toId` against the registry (dropping edges to unknown entities) and applies the optional `kind`/`type` filters. Bidirectionality is the contributor's job — it emits both directions with its own forward/reverse kinds (so "edges touching X" = X's outgoing edges).

## Dependencies
None — foundational primitive; can land in parallel with WORK-276/WORK-277.

## References
- {% ref "SPEC-072" /%} — Capability 1 (edge model + registry surface).
- {% ref "ADR-011" /%} — relationships as a generic rune over a core graph.

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/types/src/pipeline.ts` — added `EntityEdge { fromId, toId, kind: string, fromType?, toType? }` and `ResolvedEdge`; added optional `relate(edge)` and `getRelated(id, opts?)` to the `EntityRegistry` interface (optional so the many lightweight registry mocks across plugin tests keep compiling).
- `packages/types/src/index.ts` — re-export `EntityEdge`/`ResolvedEdge`.
- `packages/content/src/registry.ts` — `EntityRegistryImpl` stores outgoing edges in `edgesByFrom` keyed by `fromId`; `relate` dedupes exact `(fromId, toId, kind)`; `getRelated` resolves each target (via `toType`, else scanning types), drops unknown targets, and filters by `kind`/`type`.
- `packages/content/test/registry.test.ts` — covers directed edges, dedup, kind/type filtering, unknown-target drop, and type-scan resolution.

### Notes
- Made `relate`/`getRelated` optional on the interface to avoid forcing stubs into ~7 object-literal `EntityRegistry` mocks across content/plan/storytelling tests. The real `EntityRegistryImpl` (the site build path) implements them fully; consumers guard with optional access.
- "Edges touching X" = X's outgoing edges; bidirectional relationships are the contributor's responsibility (WORK-279).

{% /work %}
