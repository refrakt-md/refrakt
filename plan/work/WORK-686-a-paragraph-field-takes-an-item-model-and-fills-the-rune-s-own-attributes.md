{% work id="WORK-686" status="in-progress" priority="high" complexity="moderate" source="SPEC-182" tags="runes, composition, content-model, reinterpretation" milestone="v0.44.0" %}

# A paragraph field takes an item model, and fills the rune's own attributes

The content model reads structured values out of a list item (`itemModel`) and a heading
(`headingExtract`), but not out of a paragraph, and what it extracts can only reach an emitted
child or `$each` ({% ref "SPEC-182" /%}). This item adds both missing pieces, reusing the
list-item vocabulary.

## Acceptance Criteria

- [x] A sequence field matching `paragraph` accepts `itemModel` and resolves to one record, with the list-item vocabulary unchanged (D1)
- [x] A field with an item model matches only a paragraph in which its required fields match; any other paragraph is left for the next field or reported unmatched (D3)
- [x] `fills` maps the rune's declared attributes to extracted fields; an undeclared attribute or an unknown `$` field is rejected at definition load, naming it (D2)
- [x] The author's attribute wins over a filled value, and the filled value reaches the field bag, so meta blocks, the schema table and registration read it as they read the attribute (D2, D4)
- [x] Writing both forms keeps the attribute, consumes the paragraph and reports a `fill-overridden` warning naming the attribute and line (D4)
- [x] A filling field counts as placed for SPEC-145 D11, and placing it with a slot as well is rejected (D5)
- [x] The composed-runes guide documents paragraph item models and `fills`, and every new error code has an entry in its Errors table

## References

- {% ref "SPEC-182" /%}: D1–D5.
- {% ref "SPEC-145" /%}: D4a, D11.

{% /work %}
