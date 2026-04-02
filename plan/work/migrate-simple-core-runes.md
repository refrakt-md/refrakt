{% work id="WORK-099" status="ready" priority="high" complexity="simple" tags="runes, content-model" milestone="v1.0.0" %}

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

- [ ] `accordion` rewritten using `createContentModelSchema` with `sections` content model
- [ ] `budget` rewritten using `createContentModelSchema` with `sequence` content model
- [ ] `reveal` rewritten using `createContentModelSchema` with `delimited` content model
- [ ] `sandbox` rewritten using `createContentModelSchema` with `sequence` content model
- [ ] `refrakt inspect <rune> --type=all` output is identical before and after for each rune
- [ ] All existing tests pass after each migration
- [ ] No Model class import remains in any of the migrated files

## Approach

For each rune:
1. Capture baseline output with `refrakt inspect <rune> --type=all --json`
2. Rewrite schema using `createContentModelSchema` — map `@attribute` to `attributes`, `@group` to content model fields, `transform()` to the transform function
3. Compare output to baseline — must be identical
4. Run `npx vitest run` for any related test files

## References

- SPEC-032 (parent spec)

{% /work %}
