{% work id="WORK-105" status="done" priority="high" complexity="moderate" tags="runes, types, architecture" milestone="v1.0.0" %}

# Add dual-signature support to createComponentRenderable and update RuneDescriptor

Phase 1 of ADR-005. Update `createComponentRenderable` to accept either the current `Type` first argument or a new inline `{ rune: string, schemaOrgType?: string }` form. Update `RuneDescriptor` and `Rune` class to carry `typeName?: string` and `schemaOrgType?: string` instead of `type?: Type`.

Both signatures must work simultaneously so Phase 2 migration can happen incrementally.

## Acceptance Criteria

- [ ] `createComponentRenderable` in `packages/runes/src/lib/component.ts` accepts both `Type` and `{ rune: string, schemaOrgType?: string, ...TransformResult }` signatures
- [ ] When called with the new signature, output is identical to the old signature (same `typeof`, `data-rune`, RDFa attributes)
- [ ] `RuneDescriptor` in `packages/runes/src/rune.ts` has `typeName?: string` and `schemaOrgType?: string` fields alongside the existing `type?: Type`
- [ ] `Rune` class exposes `typeName` and `schemaOrgType` as readonly fields, derived from either the new string fields or the legacy `Type` instance
- [ ] All existing tests pass with no changes to rune schemas
- [ ] TypeScript compiles cleanly — no type errors in any package

## Approach

1. In `packages/runes/src/lib/component.ts`, add a type guard to detect whether the first argument is a `Type` instance or an inline object with `rune` field
2. Extract the `name` and `schemaOrgType` from whichever form is provided, then continue with the existing logic
3. In `packages/runes/src/rune.ts`, add optional `typeName` and `schemaOrgType` string fields to `RuneDescriptor`
4. In the `Rune` class, compute `typeName` from `descriptor.typeName ?? descriptor.type?.name` and similarly for `schemaOrgType`
5. Update the `Type` and `TypeFactory` exports in `packages/types/src/schema/index.ts` to add deprecation JSDoc comments

## Key Files

- `packages/runes/src/lib/component.ts` — `createComponentRenderable` function (line 24)
- `packages/runes/src/rune.ts` — `RuneDescriptor` interface (line 4) and `Rune` class (line 37)
- `packages/types/src/schema/index.ts` — `Type`, `TypeFactory`, `useSchema` definitions

## References

- ADR-005 (Phase 1)

{% /work %}
