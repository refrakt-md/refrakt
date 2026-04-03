{% work id="WORK-106" status="done" priority="high" complexity="simple" tags="runes, types" milestone="v1.0.0" %}

# Migrate core runes to inline rune identifiers

Phase 2a of ADR-005. Update all ~37 core rune transforms in `packages/runes/src/tags/` to use the new inline `{ rune: 'name' }` signature for `createComponentRenderable` instead of importing `schema.X` from the registry. Each update is a 2-3 line change per file.

Depends on WORK-105 (dual-signature support) being complete.

## Runes

All core rune tags in `packages/runes/src/tags/` that call `createComponentRenderable(schema.X, ...)`. Approximately 37 files including: accordion, annotate, bg, blog, breadcrumb, budget, chart, codegroup, compare, conversation, datatable, details, diagram, diff, embed, error, figure, gallery, grid, hint, juxtapose, mediatext, nav, pagination, pullquote, reveal, sandbox, showcase, sidenote, tabs, textblock, tint, toc, xref, and page-level types.

## Acceptance Criteria

- [x] Every `createComponentRenderable(schema.X, { ... })` call in `packages/runes/src/tags/` is replaced with `createComponentRenderable({ rune: 'x', ... })`
- [x] Runes with `schemaOrgType` pass it in the new inline object
- [x] No core rune file imports from `packages/runes/src/registry.ts`
- [x] `refrakt inspect <rune> --type=all --json` output is identical before and after for each rune
- [x] All existing tests pass

## Approach

For each rune tag file:
1. Capture baseline with `refrakt inspect <rune> --type=all --json`
2. Replace `createComponentRenderable(schema.TypeName, { ... })` with `createComponentRenderable({ rune: 'type-name', ... })`
3. If the Type had a `schemaOrgType`, add `schemaOrgType: 'X'` to the inline object
4. Remove the `schema` import if no longer needed
5. Verify output matches baseline

This is mechanical — each file needs the same 2-3 line change.

## References

- ADR-005 (Phase 2)
- WORK-105 (dependency — dual-signature support)

{% /work %}
