{% work id="WORK-327" status="done" priority="low" complexity="moderate" source="SPEC-081" tags="contracts,docs,cleanup,layout,projection" milestone="v0.18.0" %}

# Surface grouped skeleton in contracts; deprecate projection.group/relocate

Finish {% ref "SPEC-081" /%}: teach the contract generator about
declaratively-grouped skeletons, and retire the projection operations now
subsumed by recursive `layout`.

## Acceptance Criteria

- [x] `generateStructureContract` emits created wrappers (tag, selector,
  child order / membership) for `layout`-grouped runes — the whole skeleton, not
  just projected metadata blocks.
- [x] Both structure contract files regenerated; the contracts test passes.
- [x] `projection.group` / `projection.relocate` are deprecated (subsumed by
  `layout`) — warn and/or document; `projection.hide` and projection-for-
  unowned-trees are retained.
- [x] Theme-authoring docs (`blocks-and-layout.md`) updated to the recursive
  `layout` shape (wrapper-creating entries, resolution order).

## Dependencies

- {% ref "WORK-324" /%} — the recursive `layout` resolver.
- {% ref "WORK-325" /%} — runes emitting grouped skeletons to describe.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly.

## Resolution

Completed: 2026-06-03

Branch: `claude/rune-contract-hardening`

### What was done
- `packages/transform/src/contracts.ts` — `generateStructureContract` now
  emits every `layout`-created wrapper (a `tag`-entry) as an addressable
  element (`source: 'layout'`) carrying its tag, selector, ordered `children`
  membership, and any static `attrs`. Surfaces the whole declarative skeleton
  (content columns, preamble headers), not just projected metadata blocks.
  Added `children` / `attrs` to the contract element shape.
- Regenerated both `contracts/structures.json` and
  `packages/lumina/contracts/structures.json`; contracts tests pass.
- `projection.group` / `projection.relocate` deprecated: `@deprecated` JSDoc
  on the `projection` types in `types.ts` (with the SPEC-081 boundary note),
  plus a contract-generator warning emitted whenever they're used.
  `projection.hide` and reshaping-unowned-trees are retained.
- `site/content/extend/theme-authoring/blocks-and-layout.md` rewritten to the
  recursive `LayoutEntry` shape: wrapper-creating vs ordering entries, the
  name-resolution order (layout-tag → layout-order → block → node → skip),
  diamond/cycle rules, the flat-emit idiom, updated worked examples
  (event/character/recipe/budget to their migrated recursive configs), a new
  Projection section documenting the boundary + deprecation, and the new
  layout-wrapper contract output.
- Added contract unit tests (`packages/transform/test/contracts.test.ts`):
  layout-wrapper surfacing (membership, attrs, root/tagless/bare-array
  skipping, autoLabel supersede) and the group/relocate deprecation warnings
  (+ hide not deprecated).

### Notes
- No config uses `projection.group` / `relocate` anymore (WORK-325 subsumed
  them into `layout`), so deprecation is JSDoc + contract-warning + docs; the
  engine implementation is retained for backward compatibility / unowned-tree
  reshaping.
- Transform-built leaf structures that aren't declared in `layout` (e.g.
  budget's footer, kept transform-built per the WORK-326 decision) remain
  invisible to the contract — a known, accepted gap.
- Lone full-suite failure is the known WORK-330 dogfood flake (passes in
  isolation).

{% /work %}
