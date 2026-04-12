{% work id="WORK-099" status="done" priority="high" complexity="simple" tags="runes, content-model" milestone="v1.0.0" source="SPEC-032" %}

# Migrate simple core runes from Model to createContentModelSchema

Migrate the straightforward core runes that use `@group` decorators with sequential or sectioned patterns. These have no custom `processChildren` logic — they map directly to `sequence`, `sections`, or `delimited` content models.

## Runes

| Rune | File | Pattern | Content model |
|------|------|---------|---------------|
| accordion | `packages/runes/src/tags/accordion.ts` | @group sections | sections |
| budget | `packages/runes/src/tags/budget.ts` | @group sequential | sequence |
| reveal | `packages/runes/src/tags/reveal.ts` | @group delimited | delimited |
| sandbox | `packages/runes/src/tags/sandbox.ts` | @group sequential | sequence |

## Acceptance Criteria

- [x] `accordion` rewritten using `createContentModelSchema` with `sections` content model
- [x] `budget` rewritten using `createContentModelSchema` with `sequence` content model
- [x] `reveal` rewritten using `createContentModelSchema` with `delimited` content model
- [x] `sandbox` rewritten using `createContentModelSchema` with `sequence` content model
- [x] `refrakt inspect <rune> --type=all` output is identical before and after for each rune
- [x] All existing tests pass after each migration
- [x] No Model class import remains in any of the migrated files

## Approach

For each rune:
1. Capture baseline output with `refrakt inspect <rune> --type=all --json`
2. Rewrite schema using `createContentModelSchema` — map `@attribute` to `attributes`, `@group` to content model fields, `transform()` to the transform function
3. Compare output to baseline — must be identical
4. Run `npx vitest run` for any related test files

## References

- {% ref "SPEC-032" /%} (parent spec)

{% /work %}
