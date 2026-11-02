{% work id="WORK-674" status="done" priority="low" complexity="simple" source="ADR-047" tags="runes, composition, content-model, schema, validation" milestone="v0.46.0" pr="refrakt-md/refrakt#755" %}

# A composition's narrative field is checked at definition load

{% ref "ADR-047" /%} lets a rune declare one narrative field that accepts only the editorial runes
`textblock` and `mediatext`, and says the field is never published as structured data. As
amended, the field is inferred from its match, and both rules are checked.

## Acceptance Criteria

- [x] A content-model field whose `match` names editorial runes (`tag:textblock`, `tag:mediatext`) and nothing else is recognised as the narrative field
- [x] A definition declaring more than one narrative field is rejected at load, naming the fields
- [x] A definition whose schema table maps a narrative field is rejected at load, naming the field and the property
- [x] A field that mixes editorial runes with other matches is not a narrative field and is not checked as one
- [x] `reference` and `inspect` show which field is the narrative field
- [x] A fixture composition with a `story` field renders the story between two template parts, publishes no part of it in JSON-LD, and raises no slot-role warning ({% ref "ADR-046" /%})

## References

- {% ref "ADR-047" /%}: decisions 1 and 2, as amended.

## Resolution

Completed: 2026-11-02

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/lib/composition.ts`:
  - `isNarrativeMatch` (exported) and `modelFieldDefinitions`;
  - `schemaSourceNames` walks properties and text in rows, fallback, entities and children;
  - `compileComposition` rejects a second narrative field (`narrative-field-twice`) and a mapped one (`narrative-field-mapped`), and records `CompositionInfo.narrativeField`.
- `composition-errors.ts`: the two codes.
- `packages/runes/src/reference.ts` and `packages/cli/src/commands/inspect.ts` print the narrative field; inspect's JSON carries it.
- `packages/runes/test/composition-narrative.test.ts`: inference, the `dish` fixture (story between section and card; no property in the story; no slot-header-role finding), both rejections, the mixed-match case, and reference.

### Notes
- Only the content model's top-level fields are considered (the slots a template places); a section model's per-section fields are not.

{% /work %}
