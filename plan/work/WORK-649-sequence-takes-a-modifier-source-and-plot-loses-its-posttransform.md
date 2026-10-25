{% work id="WORK-649" status="done" priority="low" complexity="simple" source="SPEC-147" tags="engine, config, storytelling, sequence" milestone="v0.42.0" pr="refrakt-md/refrakt#716" %}

# sequence takes a modifier source, and plot loses its postTransform

`RuneConfig.sequence` takes a literal (`'numbered' | 'connected' | 'plain'`), while
`sequenceDirection` beside it takes `{ fromModifier, default }`
(`packages/transform/src/types.ts`). `plot` needs its sequence style keyed on its `structure`
modifier, so it uses a `postTransform` (`plugins/storytelling/src/config.ts`), one of four left
in the codebase. Giving `sequence` the same form deletes it ({% ref "SPEC-147" /%} Finding 1,
implementation note 1).

## Acceptance Criteria

- [x] `sequence` accepts `{ fromModifier, default? }` as well as a literal, resolved the same way as `sequenceDirection`
- [x] `plot` declares its sequence through the modifier form and has no `postTransform`; its fixtures and contract entry are unchanged on both contract copies
- [x] The theme-authoring config reference documents the new form
- [x] The `sequence` adoption count is re-measured and recorded in the resolution (six runes before this item, seven after)

## Approach

This changes the native `plot` in the plugin. A composed `plot` is not part of this item:
{% ref "SPEC-169" /%} D6 sends a composition's sequence styling to {% ref "SPEC-156" /%}'s
ladder, not to `RuneConfig.sequence`, and SPEC-156 is still draft. This item is worth doing
anyway, because the plugin stays until the swap decision (SPEC-147 D1) and the form is useful to
any native rune with a modifier-keyed sequence.

## References

- {% ref "SPEC-147" /%}: Finding 1, implementation note 1.
- {% ref "ADR-036" /%}: the declarative sibling already exists.

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- `packages/transform/src/types.ts`: `SequenceStyle` and `SequenceSource { fromModifier, valueMap?, default? }`; `sequence` takes either. `engine.ts`: `resolveSequenceStyle` resolves it the way `sequenceDirection` resolves, and annotates nothing when no style resolves.
- `plugins/storytelling/src/config.ts`: `plot` declares `sequence: { fromModifier: 'structure', valueMap: { linear: 'connected' } }`; its `postTransform` is gone. `refrakt inspect plot` HTML is byte-identical for all four structures. Contracts are unchanged on both copies.
- `packages/cli/src/lib/dimension-audit.ts` counts a modifier-sourced rune under every style it can produce. Tests: `packages/transform/test/sequence-source.test.ts`. Docs: theme-authoring `config-api.md` "sequence".
- **Adoption re-measured:** 7 runes (Timeline, ItineraryDay, HowTo, Recipe, Steps, Playlist, Plot), up from 6. `postTransform`s left: 3.

### Notes
- `valueMap` goes beyond SPEC-147's `{ fromModifier, default }`. `structure`'s values are not sequence styles, so a bare modifier read would emit `data-sequence="linear"`. It mirrors the `valueMap` modifiers already have.

{% /work %}
