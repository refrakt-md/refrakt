{% work id="WORK-270" status="pending" priority="high" complexity="moderate" source="SPEC-071" tags="plan, embed, pipeline" milestone="v0.16.0" %}

# Plan entity embeddability (sourceFile + extract)

Make plan entities embeddable so `{% expand $item.id /%}` renders their bodies in entityRoutes detail pages. The plan register hook currently sets `sourceUrl` only; add `sourceFile` and an `extract` that returns the entity rune's transformed body. This is the prerequisite the SPEC-071 dogfood depends on.

## Acceptance Criteria
- [ ] The plan register hook sets `sourceFile` (the entity's source `.md` path) for spec / work / bug / decision / milestone
- [ ] An `extract` returns the entity rune's top-level subtree so `{% expand $item.id /%}` inlines the entity body
- [ ] entityRoutes detail pages for plan entities render non-empty content
- [ ] Tests confirm `expand` works on each plan entity type

## Dependencies
- WORK-269 (embed() embeddability contract)

## References

- {% ref "SPEC-071" /%}
- {% ref "SPEC-069" /%} — embeddability contract

{% /work %}
