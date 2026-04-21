{% work id="WORK-103" status="done" priority="high" complexity="moderate" tags="runes, content-model, architecture" milestone="v1.0.0" source="SPEC-032" %}

# Remove legacy Model class, decorators, and createSchema

Once all runes are migrated to `createContentModelSchema`, delete the legacy API surface from `@refrakt-md/runes`.

## Files to delete

- `packages/runes/src/lib/model.ts` — Model base class
- `packages/runes/src/lib/annotations/attribute.ts` — @attribute decorator
- `packages/runes/src/lib/annotations/group.ts` — @group / @groupList decorators
- `packages/runes/src/lib/annotations/id.ts` — @id decorator
- `packages/runes/src/lib/annotations/` — entire directory if empty after above

## Exports to remove

From `packages/runes/src/lib/index.ts` and `packages/runes/src/index.ts`:
- `Model`
- `attribute`
- `group`, `groupList`
- `id`
- `createSchema`
- `NodeStream`, `RenderableNodeCursor` (if only used by Model)

## Acceptance Criteria

- [x] All files listed above are deleted
- [x] `Model`, `@attribute`, `@group`, `@groupList`, `@id`, `createSchema` are no longer exported from `@refrakt-md/runes`
- [x] `NodeStream` and `RenderableNodeCursor` are removed if no longer used outside Model
- [x] No remaining imports of deleted modules anywhere in the monorepo (`grep` confirms zero hits)
- [x] `npm run build` succeeds for the full monorepo
- [x] `npm test` passes
- [x] CSS coverage tests pass

## Approach

1. Remove exports from `packages/runes/src/lib/index.ts` and `packages/runes/src/index.ts`
2. Delete the files
3. Search the entire monorepo for any remaining imports of the deleted symbols
4. Full build and test pass

## Dependencies

- {% ref "WORK-099" /%} (simple core runes migrated)
- {% ref "WORK-100" /%} (simple community runes migrated)
- {% ref "WORK-101" /%} (moderate runes migrated)
- {% ref "WORK-102" /%} (complex runes migrated)

## References

- {% ref "SPEC-032" /%} (parent spec)

## Resolution

Completed: 2026-04-02

Branch: `claude/implement-spec-032-2KBbw`

### What was done
- Deleted `model.ts`, entire `annotations/` directory (6 files), removed `NodeStream` from `node.ts`
- Removed `createSchema`, `Model`, `attribute`, `group`, `groupList`, `id`, `NodeStream` exports from `lib/index.ts` and `index.ts`
- Converted `SplitLayoutModel` from Model subclass to plain `splitLayoutAttributes` record
- Updated `createContentModelSchema` `base` option to accept plain `Record<string, SchemaAttribute>` instead of `Newable<Model>`
- Updated error message in `packages.ts`
- Removed `Group` interface from `interfaces.ts`
- 696 lines deleted, 58 added

### Notes
- `RenderableNodeCursor` is still used extensively by all runes — kept as-is
- `isFilterMatching` in `node.ts` is still used by `util.ts` — kept
- `TypedNode` and `TransformFunction` in `interfaces.ts` are unused but harmless public types — left in place
- All 7 rune files using `base: SplitLayoutModel` work unchanged since `SplitLayoutModel` is now aliased to the plain `splitLayoutAttributes` object

{% /work %}
