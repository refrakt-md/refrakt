{% work id="WORK-649" status="ready" priority="low" complexity="simple" source="SPEC-147" tags="engine, config, storytelling, sequence" milestone="v0.42.0" %}

# sequence takes a modifier source, and plot loses its postTransform

`RuneConfig.sequence` takes a literal (`'numbered' | 'connected' | 'plain'`), while
`sequenceDirection` beside it takes `{ fromModifier, default }`
(`packages/transform/src/types.ts`). `plot` needs its sequence style keyed on its `structure`
modifier, so it uses a `postTransform` (`plugins/storytelling/src/config.ts`), one of four left
in the codebase. Giving `sequence` the same form deletes it ({% ref "SPEC-147" /%} Finding 1,
implementation note 1).

## Acceptance Criteria

- [ ] `sequence` accepts `{ fromModifier, default? }` as well as a literal, resolved the same way as `sequenceDirection`
- [ ] `plot` declares its sequence through the modifier form and has no `postTransform`; its fixtures and contract entry are unchanged on both contract copies
- [ ] The theme-authoring config reference documents the new form
- [ ] The `sequence` adoption count is re-measured and recorded in the resolution (six runes before this item, seven after)

## Approach

This changes the native `plot` in the plugin. A composed `plot` is not part of this item:
{% ref "SPEC-169" /%} D6 sends a composition's sequence styling to {% ref "SPEC-156" /%}'s
ladder, not to `RuneConfig.sequence`, and SPEC-156 is still draft. This item is worth doing
anyway, because the plugin stays until the swap decision (SPEC-147 D1) and the form is useful to
any native rune with a modifier-keyed sequence.

## References

- {% ref "SPEC-147" /%}: Finding 1, implementation note 1.
- {% ref "ADR-036" /%}: the declarative sibling already exists.

{% /work %}
