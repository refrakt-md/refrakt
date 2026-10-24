{% work id="WORK-646" status="ready" priority="high" complexity="moderate" source="SPEC-169" tags="runes, composition, content-model" milestone="v0.42.0" %}

# Compositions accept a delimited content model with fixed zones

A composition's `content.type` must be `sequence` or `sections`
(`packages/runes/src/lib/composition.ts`). Five runes split their content on `---` and need to
address a field inside a zone: `hero`, `feature`, `step`, `recipe` and `playlist`. None of them
can be a composition until the parser accepts `type: delimited`. The `DelimitedModel` type
already exists (`packages/types/src/content-model.ts`), so this is a parser and resolver
change, not a new model ({% ref "SPEC-169" /%} D1).

## Acceptance Criteria

- [ ] A composition accepts `type: delimited` with `delimiter: hr` and fixed `zones`, honours `primary` for input with no delimiter, and places each zone field as a slot
- [ ] A field name in two zones, a delimiter other than `hr`, and `dynamicZones` are each construction errors with their own message
- [ ] The composition consumes the delimiters, and a template that re-emits `---` around a placed `card` splits it into media and body, asserted against a fixture
- [ ] `refrakt inspect` and `refrakt reference` show a delimited composition's zones and slots
- [ ] The composed-runes guide documents the delimited model with the fixture as its example
- [ ] SPEC-145 D18's statement about recipe's delimited model carries a note pointing to SPEC-169 D1

## Approach

- The slots are the union of the zones' fields (D1 rule 1).
- SPEC-169's own fixture is a composed `hero` over `section`. That needs `section`'s split
  ({% ref "SPEC-160" /%} D2) and the `actions` primitive (D6), which are in v0.43.0. This item
  proves the model with a fixture over `card`, which splits on `---` today. The `hero` fixture
  is part of the `actions` work item in v0.43.0.
- SPEC-169's example writes `{% section forward="split" %}`. `forward` is {% ref "SPEC-168" /%}'s
  and not implemented; the fixture passes attributes through explicitly.

## References

- {% ref "SPEC-169" /%}: D1.
- {% ref "SPEC-145" /%}: D17 (unconditional delimiters), D18.

{% /work %}
