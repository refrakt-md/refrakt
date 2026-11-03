{% work id="WORK-693" status="in-progress" priority="medium" complexity="moderate" source="SPEC-186" tags="content-model, resolver, composition" milestone="v0.47.0" %}

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

{% /work %}
