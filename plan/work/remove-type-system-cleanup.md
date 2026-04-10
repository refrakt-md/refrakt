{% work id="WORK-109" status="done" priority="medium" complexity="moderate" tags="runes, types, architecture" milestone="v1.0.0" source="ADR-005" %}

# Remove Type system — delete schema classes, registries, and old signature

Phase 3 of ADR-005 (breaking change). Once all runes are migrated (WORK-106, WORK-107) and tooling updated (WORK-108), remove the legacy `Type` class system entirely.

Depends on WORK-106, WORK-107, and WORK-108 all being complete.

## Acceptance Criteria

- [x] `createComponentRenderable` only accepts the new inline `{ rune, schemaOrgType?, ... }` signature — old `Type` overload removed
- [x] `Type`, `TypeFactory`, and `useSchema` deleted from `packages/types/src/schema/index.ts`
- [x] All ~35 schema class files in `packages/runes/src/schema/` deleted
- [x] All schema class files in community packages (`runes/*/src/schema/`) deleted
- [x] `packages/runes/src/registry.ts` deleted (or reduced to only non-Type exports if any exist)
- [x] `RuneDescriptor.type` field removed — only `typeName` and `schemaOrgType` remain
- [x] `Rune` class no longer references `Type`
- [x] `@refrakt-md/types` no longer exports schema classes (`Page`, `Hint`, etc.)
- [x] All tests pass
- [x] TypeScript compiles cleanly across the entire monorepo
- [x] A changeset is created for the breaking change

## Scope

- ~35 schema class files to delete in `packages/runes/src/schema/`
- ~30 schema class files to delete across `runes/*/src/schema/` (9 community packages)
- ~10 registry/index files to update
- 1 function signature to simplify (`createComponentRenderable`)
- 1 interface to simplify (`RuneDescriptor`)
- 1 class to simplify (`Rune`)
- Barrel export cleanup in `packages/types/src/index.ts` and `packages/runes/src/index.ts`

## Approach

1. Remove the `Type` overload from `createComponentRenderable` — keep only the inline signature
2. Delete all `schema/` directories: `packages/runes/src/schema/` and each `runes/*/src/schema/`
3. Delete or gut `packages/runes/src/registry.ts`
4. Remove `Type`, `TypeFactory`, `useSchema` from `packages/types/src/schema/index.ts`
5. Clean up `RuneDescriptor` — remove `type?: Type` field
6. Remove schema class re-exports from barrel files
7. Run full build (`npm run build`) and fix any remaining references
8. Run full test suite (`npm test`)
9. Create changeset documenting the breaking change

## References

- ADR-005 (Phase 3)
- WORK-105 (dependency — dual-signature support)
- WORK-106 (dependency — core rune migration)
- WORK-107 (dependency — community rune migration)
- WORK-108 (dependency — tooling update)

{% /work %}
