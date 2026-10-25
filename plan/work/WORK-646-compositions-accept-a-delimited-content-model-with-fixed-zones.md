{% work id="WORK-646" status="done" priority="high" complexity="moderate" source="SPEC-169" tags="runes, composition, content-model" milestone="v0.42.0" pr="refrakt-md/refrakt#714" %}

# Compositions accept a delimited content model with fixed zones

A composition's `content.type` must be `sequence` or `sections`
(`packages/runes/src/lib/composition.ts`). Five runes split their content on `---` and need to
address a field inside a zone: `hero`, `feature`, `step`, `recipe` and `playlist`. None of them
can be a composition until the parser accepts `type: delimited`. The `DelimitedModel` type
already exists (`packages/types/src/content-model.ts`), so this is a parser and resolver
change, not a new model ({% ref "SPEC-169" /%} D1).

## Acceptance Criteria

- [x] A composition accepts `type: delimited` with `delimiter: hr` and fixed `zones`, honours `primary` for input with no delimiter, and places each zone field as a slot
- [x] A field name in two zones, a delimiter other than `hr`, and `dynamicZones` are each construction errors with their own message
- [x] The composition consumes the delimiters, and a template that re-emits `---` around a placed `card` splits it into media and body, asserted against a fixture
- [x] `refrakt inspect` and `refrakt reference` show a delimited composition's zones and slots
- [x] The composed-runes guide documents the delimited model with the fixture as its example
- [x] SPEC-145 D18's statement about recipe's delimited model carries a note pointing to SPEC-169 D1

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

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- `packages/runes/src/lib/composition.ts`: `parseDelimitedModel` parses `type: delimited` (zones, `primary`); `checkDelimitedModel` is shared by the parser and the compiler and rejects a field in two zones (`zone-field-twice`), a non-`hr` delimiter (`delimiter-unsupported`) and `dynamicZones`/`zoneModel` (`dynamic-zones`). `slotFields` takes the union of the zones' fields; `slotValues` merges the per-zone resolved records before the template expands.
- `packages/runes/src/reference.ts`: serializes and prints a zone's `primary`, and prints `Template slots:` for a composition. `packages/cli/src/commands/inspect.ts`: a Composition section, and `composition` in `--json`.
- Fixture `packages/runes/test/fixtures/composed/teaser.md` (over `card`), tested in `composition-models.test.ts` and `packages/cli/test/rune-dir-tooling.test.ts`; the guide includes it.
- SPEC-145 D18's correction note points to this item.

### Notes
- The composed `hero` fixture stays with WORK-654 (v0.43.0), as planned.

{% /work %}
