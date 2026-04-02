{% work id="WORK-103" status="ready" priority="high" complexity="moderate" tags="runes, content-model, architecture" milestone="v1.0.0" %}

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

- [ ] All files listed above are deleted
- [ ] `Model`, `@attribute`, `@group`, `@groupList`, `@id`, `createSchema` are no longer exported from `@refrakt-md/runes`
- [ ] `NodeStream` and `RenderableNodeCursor` are removed if no longer used outside Model
- [ ] No remaining imports of deleted modules anywhere in the monorepo (`grep` confirms zero hits)
- [ ] `npm run build` succeeds for the full monorepo
- [ ] `npm test` passes
- [ ] CSS coverage tests pass

## Approach

1. Remove exports from `packages/runes/src/lib/index.ts` and `packages/runes/src/index.ts`
2. Delete the files
3. Search the entire monorepo for any remaining imports of the deleted symbols
4. Full build and test pass

## Dependencies

- WORK-099 (simple core runes migrated)
- WORK-100 (simple community runes migrated)
- WORK-101 (moderate runes migrated)
- WORK-102 (complex runes migrated)

## References

- SPEC-032 (parent spec)

{% /work %}
