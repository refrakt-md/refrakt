{% work id="WORK-647" status="ready" priority="medium" complexity="simple" source="SPEC-169" tags="runes, composition, content-model" milestone="v0.42.0" %}

# Compositions accept implicitSection on a sections model

`implicitSection` exists on the sections model (`packages/types/src/content-model.ts`): when no
section heading is found, all children become one section instead of preamble. The composition
parser does not accept the key, so `itinerary`, whose conditional content model only exists to
add it, cannot be expressed. Accepting it removes that rune's need for a conditional model
({% ref "SPEC-169" /%} D2, D3).

## Acceptance Criteria

- [ ] A composition accepts `implicitSection` on a sections model, and its attribute keys must equal `emitAttributes`' keys, with an error naming the mismatch otherwise
- [ ] With no section heading, all content becomes one item of the `sections` slot, and `$each` is bound the same way as for a real section, asserted in a test
- [ ] The error for a conditional content model names SPEC-169's alternatives: implicit sections, list `each` and templates
- [ ] The composed-runes guide documents `implicitSection`

## Approach

- In a composition there is no `emitTag`, so the implicit section is an ordinary item of the
  `sections` slot and its `attributes` supply the `$each` values (D3).
- The error text for a conditional model is shared with {% ref "WORK-648" /%}'s and D5's
  alternatives. D5 (templates covering several values) waits on SPEC-168's templates; name it
  in the message only once it exists, or phrase the message so it does not promise it.

## References

- {% ref "SPEC-169" /%}: D2, D3.

{% /work %}
