{% work id="WORK-088" status="done" priority="high" complexity="simple" tags="frameworks, transform, svelte" milestone="v1.0.0" source="ADR-001,ADR-002,SPEC-030" %}

# Extract shared utilities from @refrakt-md/svelte to @refrakt-md/transform

Prerequisite for all framework adapters. Two modules in `@refrakt-md/svelte` are framework-agnostic and needed by every adapter package.

## Acceptance Criteria

- [ ] `serialize()` and `serializeTree()` moved to `packages/transform/src/serialize.ts`
- [ ] `matchRouteRule()` moved to `packages/transform/src/route-rules.ts`
- [ ] Both are exported from `@refrakt-md/transform` public API (`packages/transform/src/index.ts`)
- [ ] `@refrakt-md/svelte` re-exports both modules — no breaking change for existing consumers
- [ ] `@refrakt-md/transform` adds `@markdoc/markdoc` as a dependency (needed by `serialize()`)
- [ ] All existing tests pass without modification
- [x] Build succeeds in dependency order (types → transform → svelte)

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

## Resolution

Completed: 2026-04-02

Branch: `claude/implement-spec-030-F0LFn`

### What was done
- Moved `serialize()` and `serializeTree()` from `packages/svelte/src/serialize.ts` to `packages/transform/src/serialize.ts`
- `matchRouteRule()` was already in `packages/transform/src/route-rules.ts` (previously extracted)
- Added `@markdoc/markdoc` as dependency to `@refrakt-md/transform`
- Exported both `serialize` and `serializeTree` from transform's public API
- Updated `@refrakt-md/svelte` serialize.ts to re-export from transform
- All 167 test files (1877 tests) pass, build succeeds

### Notes
- Route rules extraction was already done in a prior session — only serialize needed moving

{% /work %}
