{% work id="WORK-269" status="ready" priority="medium" complexity="moderate" source="SPEC-069" tags="runes, expand, embed" milestone="v0.16.0" %}

# embed() embeddability contract

Generalize SPEC-066's `sourceFile` + `extract` into the `embed()` contract: an entity is embeddable if it has `embed()` *or* (`sourceFile` + `extract`). `expand` and the `entityRoutes` adapter accept either, so external plugins can make entities embeddable without a source file on disk.

## Acceptance Criteria
- [ ] An entity is embeddable if it has `embed()` or (`sourceFile` + `extract`); `expand` resolves both forms
- [ ] `embed()` returns the entity's renderable subtree (or source) for inlining
- [ ] Entities with neither produce a clear build error when expanded, naming the entity
- [ ] The existing plan expand path (sourceFile + extract, from v0.15.0) continues to work unchanged

## Dependencies
None — extends the existing expand/embeddability machinery; WORK-270 uses it for plan entities.

## References

- {% ref "SPEC-069" /%}

{% /work %}
