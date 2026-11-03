{% work id="WORK-693" status="done" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, resolver, composition" milestone="v0.47.0" pr="refrakt-md/refrakt#759" %}

# A block field reads its node's children with a nested model

SPEC-186 D2: a field matching a block node may declare `model`, a content model applied to that node's children, whose members resolve to dotted names.

## Acceptance Criteria
- [x] A block field accepts `model`, and still matches the whole node (D2.1)
- [x] Its members resolve to dotted names (`quote.attribution`), to any depth
- [x] A composition places a member by its dotted name or the whole node by the field's name, not both (D2.2)
- [x] An unmatched child inside the node is reported `content-unmatched`, naming the field (D2.4)
- [x] A nested model on a non-block field is rejected at load, and the composed-runes guide documents nested models

## References

- {% ref "SPEC-186" /%}: D2, D6.

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/types/src/content-model.ts`: `ContentFieldDefinition.model` (a `SequenceModel`).
- `packages/runes/src/lib/resolver.ts`:
  - `takeField` resolves a non-greedy block match's children with its nested model into `name.member` keys (deeper levels are already dotted);
  - dropped children are recorded per sink with the field path, and `findUnmatchedContent` publishes them for `unmatchedInsideField`.
- `packages/runes/src/lib/index.ts`: `content-unmatched` names the nested model's field.
- `packages/runes/src/lib/composition.ts`:
  - the `model` key, parsed with `parseContentModel`, sequence only, block fields only (`content-nested-invalid`);
  - `slotFields` adds dotted members;
  - the placement rule: whole or every member, never both (`nested-placed-twice`), with partial member placement reported through `field-unplaced`.
- `packages/runes/test/content-model-nested.test.ts`; the composed-runes guide section and error rows.

{% /work %}
