{% work id="WORK-316" status="ready" priority="high" complexity="complex" source="SPEC-080" tags="plan,plugin,runes,migration,blocks,layout" milestone="v0.17.0" %}

# Migrate `plan` package to blocks/layout

Re-migrate the plan family (work, spec, bug, decision, milestone) from the
SPEC-079 `metaFields` + `zones` model (`WORK-306`, done) to the
{% ref "SPEC-080" /%} blocks/layout model. The `metaFields` manifest is
reused as-is; the `zones` / `contentSlots` / `order` / dispatcher reliance
is replaced by transforms that build named-block trees plus `blocks` /
`layout` config. This is the bulk of the SPEC-080 migration — the plan
family leans hardest on the engine dispatcher.

## Acceptance Criteria

- [ ] **Transforms build a named-block tree.** Each plan rune emits its own
  addressable blocks (eyebrow content, title, body, trailers) instead of
  relying on the dispatcher to assemble from `contentSlots` + canonical
  order.
- [ ] **Configs use `blocks` + `layout`.** Eyebrow projected as a `bar`
  (id left, status `align: 'end'`); metadata block(s) per current visual;
  `zones` / `zoneLayouts` / `contentSlots` / `order` removed from the plan
  configs.
- [ ] **Pipeline intact.** Entity registration (`plugins/plan/src/pipeline.ts`)
  resolves names from the new block tree.
- [ ] **Tests + plan site.** Plan plugin tests pass and the plan site renders
  equivalently to today.

## Approach

`metaFields` already exist from `WORK-306`; the work is restructuring the
transforms to build their own block tree (dropping the dispatcher) and
writing `blocks` / `layout`. Follow the recipe / faction patterns
established on this branch as the reference.

## Dependencies

- {% ref "WORK-314" /%} — engine projection.
- {% ref "WORK-315" /%} — `bar` + field shape.

## References

- {% ref "SPEC-080" /%}, {% ref "SPEC-079" /%}; reuses `WORK-306` metaFields.

{% /work %}
