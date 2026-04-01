{% work id="WORK-088" status="ready" priority="high" complexity="simple" tags="frameworks, transform, svelte" %}

# Extract shared utilities from @refrakt-md/svelte to @refrakt-md/transform

Prerequisite for all framework adapters. Two modules in `@refrakt-md/svelte` are framework-agnostic and needed by every adapter package.

## Acceptance Criteria

- [ ] `serialize()` and `serializeTree()` moved to `packages/transform/src/serialize.ts`
- [ ] `matchRouteRule()` moved to `packages/transform/src/route-rules.ts`
- [ ] Both are exported from `@refrakt-md/transform` public API (`packages/transform/src/index.ts`)
- [ ] `@refrakt-md/svelte` re-exports both modules — no breaking change for existing consumers
- [ ] `@refrakt-md/transform` adds `@markdoc/markdoc` as a dependency (needed by `serialize()`)
- [ ] All existing tests pass without modification
- [ ] Build succeeds in dependency order (types → transform → svelte)

## Approach

1. Copy `packages/svelte/src/serialize.ts` → `packages/transform/src/serialize.ts`
2. Copy `packages/svelte/src/route-rules.ts` → `packages/transform/src/route-rules.ts`
3. Update imports in both files if needed (type imports should already point at `@refrakt-md/types`)
4. Export from `packages/transform/src/index.ts`
5. Replace original files in `packages/svelte/src/` with re-exports from `@refrakt-md/transform`
6. Update any internal imports within `packages/svelte/` that reference these modules directly

## References

- SPEC-030 (Phase 0)
- ADR-001, ADR-002 (both identify this as a shared prerequisite)

{% /work %}
