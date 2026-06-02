{% work id="WORK-327" status="ready" priority="low" complexity="moderate" source="SPEC-081" tags="contracts,docs,cleanup,layout,projection" milestone="v0.18.0" %}

# Surface grouped skeleton in contracts; deprecate projection.group/relocate

Finish {% ref "SPEC-081" /%}: teach the contract generator about
declaratively-grouped skeletons, and retire the projection operations now
subsumed by recursive `layout`.

## Acceptance Criteria

- [ ] `generateStructureContract` emits created wrappers (tag, selector,
  child order / membership) for `layout`-grouped runes — the whole skeleton, not
  just projected metadata blocks.
- [ ] Both structure contract files regenerated; the contracts test passes.
- [ ] `projection.group` / `projection.relocate` are deprecated (subsumed by
  `layout`) — warn and/or document; `projection.hide` and projection-for-
  unowned-trees are retained.
- [ ] Theme-authoring docs (`blocks-and-layout.md`) updated to the recursive
  `layout` shape (wrapper-creating entries, resolution order).

## Dependencies

- {% ref "WORK-324" /%} — the recursive `layout` resolver.
- {% ref "WORK-325" /%} — runes emitting grouped skeletons to describe.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly.

{% /work %}
