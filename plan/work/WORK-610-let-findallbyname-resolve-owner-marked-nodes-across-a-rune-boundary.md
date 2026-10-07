{% work id="WORK-610" status="done" priority="medium" complexity="simple" source="SPEC-146" milestone="v0.39.0" tags="runes,schema,seo,composition" pr="refrakt-md/refrakt#664" %}

# Let `findAllByName` resolve owner-marked nodes across a rune boundary

{% ref "SPEC-146" /%} Problem 2. `findAllByName` stops dead at any nested
`data-rune`, which is right for every rune today and wrong the moment content is
placed inside a primitive on another rune's behalf ({% ref "SPEC-145" /%}). Only
**node-sourced** values are affected: `properties` from a node, `text`, and the node
half of `entities`. Attribute-sourced values resolve through the field bag and are
untouched by nesting.

## Approach

Replace the hard stop with SPEC-146's *foreign mode*: past another rune's boundary
keep descending, but admit only nodes carrying `data-owner` equal to the resolving
rune. The marker comes from {% ref "WORK-609" /%}.

This change is meant to be **inert**: no rune places content across a boundary yet,
so the foreign branch finds nothing and output must not move (D5). The baseline
check is the proof.

## Acceptance Criteria

- [x] `findAllByName` crosses a nested-rune boundary in foreign mode, admitting only nodes marked for the resolving rune
- [x] The node-sourced scope of Problem 2 is asserted by a test pair: one table over a composed and a declared tree, where the attribute-sourced property resolves in both and the node-sourced one resolves only after the fix
- [x] A composed entity whose schema values are all attributes publishes correctly *before* this change, asserted so the narrower scope cannot be lost
- [x] Multiplicity is preserved: a node-sourced property carrying a set (`recipe`'s `ingredient` shape, {% ref "SPEC-154" /%}) resolves every member across the boundary
- [x] The `character` / `character-section` name collision the guard was added for remains suppressed, asserted by a test naming that history
- [x] `npm run seo:baseline:check` shows zero diff attributable to this change
- [x] `refrakt contracts --check` reports no drift on either contract copy

## Blocked by

- {% ref "WORK-609" /%}

## References

- {% ref "SPEC-146" /%} — Problem 2, the mechanism, D5
- {% ref "SPEC-145" /%} — the consumer this unblocks

## Resolution

Completed: 2026-10-07

Branch: `claude/v039-name-resolution`
PR: refrakt-md/refrakt#664

### What was done
- `packages/runes/src/lib/schema-table.ts`: `findAllByName` no longer stops at a nested `data-rune`. Past that boundary it keeps descending in foreign mode and admits only nodes with `data-owner` equal to the resolving rune's `data-rune`. It reuses `isMine`, so `findAllByName` and `findChildren` share one rule. A nested rune's own root node is treated as foreign too. A match still ends descent, and every match is kept, so multiplicity holds. This covers `properties` (`stamp`), `text` (`applyText` via `findByName`) and the node half of `entities` (`buildEntity`).
- `packages/runes/test/schema-table.test.ts`: 9 tests over hand-marked trees. 4 fail against the pre-fix resolver: composed node-sourced property, multiplicity, `text`, entity node. The other 5 are guards that pass before and after: declared tree, attribute-only composed entity, unmarked or other-owner nodes ignored, the `character` / `character-section` collision, and the CLI `findByName` caller on a released tree.
- Changeset: `@refrakt-md/runes` patch.

### Baseline / contract diff
None, as D5 expects. `seo:baseline:check` is up to date and both `structures.json` copies show no drift. Nothing sets `data-owner` yet.

### Notes
- `packages/cli/src/lib/schema-row.ts` calls `findByName` on rendered trees, where `releaseOwnedNodes` has already stripped every mark, so its answers are unchanged.
- In own mode, a node marked for *another* rune is now rejected (the shared `isMine` rule). That can't happen today because nothing sets marks.

{% /work %}
