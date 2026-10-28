{% work id="WORK-674" status="ready" priority="low" complexity="simple" source="ADR-047" tags="runes, composition, content-model, schema, validation" %}

# A composition's narrative field is checked at definition load

{% ref "ADR-047" /%} lets a rune declare one narrative field that accepts only the editorial runes
`textblock` and `mediatext`, and says the field is never published as structured data. As
amended, the field is inferred from its match, and both rules are checked.

## Acceptance Criteria

- [ ] A content-model field whose `match` names editorial runes (`tag:textblock`, `tag:mediatext`) and nothing else is recognised as the narrative field
- [ ] A definition declaring more than one narrative field is rejected at load, naming the fields
- [ ] A definition whose schema table maps a narrative field is rejected at load, naming the field and the property
- [ ] A field that mixes editorial runes with other matches is not a narrative field and is not checked as one
- [ ] `reference` and `inspect` show which field is the narrative field
- [ ] A fixture composition with a `story` field renders the story between two template parts, publishes no part of it in JSON-LD, and raises no slot-role warning ({% ref "ADR-046" /%})

## References

- {% ref "ADR-047" /%}: decisions 1 and 2, as amended.

{% /work %}
