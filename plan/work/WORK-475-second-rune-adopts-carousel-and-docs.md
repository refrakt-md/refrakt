{% work id="WORK-475" status="ready" priority="low" complexity="simple" source="SPEC-100" milestone="v0.26.0" tags="carousel,layout,testimonial,pricing,cast,docs" %}

# Second rune adopts carousel + carousel docs

Land at least one further rune (`testimonial` *or* `pricing` *or* `cast`) on `layout="carousel"`
through config + contract + CSS only, demonstrating zero new behavior code per adoption, and note
the layout mode on adopting runes' docs. Per {% ref "SPEC-100" /%} Phase B.6.

## Scope

- Pick one of `testimonial` / `pricing` / `cast` (whichever renders the cleanest homogeneous item
  band) and add `carousel` to its `layout` matches, mapping its item collection onto the shared
  contract; add track CSS. **Zero new behavior code.**
- Verify CSS-coverage for the new `[data-layout="carousel"]` selectors on the adopting rune.
- Docs: each adopting rune's page notes `layout="carousel"` (the contract itself was documented
  once in {% ref "WORK-470" /%}).

## Acceptance Criteria

- [ ] At least one further rune (`testimonial`/`pricing`/`cast`) adopts `layout="carousel"` through config + contract + CSS only, with zero new behavior code.
- [ ] CSS-coverage passes for the new `[data-layout="carousel"]` selectors on the adopting rune.
- [ ] The adopting rune's docs page notes `layout="carousel"`.

## Dependencies

- {% ref "WORK-472" /%} — the shared behavior the new rune binds to.
- {% ref "WORK-474" /%} — `feature` adoption proves the pattern first.

## References

- Spec: {% ref "SPEC-100" /%} Phase B.6 + Non-goals (incremental adoption; not every candidate this milestone).

{% /work %}
