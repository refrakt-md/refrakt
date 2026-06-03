{% work id="WORK-337" status="draft" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.19.0" tags="composability,engine,validation" %}

# Enforce parent nesting at build time

Turn `RuneConfig.parent` (and the new `allowedParents`/`forbiddenParents` from
SPEC-084) from documentation into a validated contract. A constrained child
rune used outside its allowed parent should surface a diagnostic instead of
rendering silently-broken output.

## Acceptance Criteria
- [ ] `RuneConfig` carries typed `allowedParents` / `forbiddenParents` (additive to the existing `parent`).
- [ ] The pipeline (or a validate pass) detects a constrained child outside its allowed parent and reports it with the rune name and location.
- [ ] Structurally-dependent children (accordion-item, tab, step, tier, bento-cell) report as errors; softer constraints report as warnings.
- [ ] Tests cover a valid nesting, an error case, and a warning case.

## Approach
Validation runs where the full tree is available. Reuse the engine's
`parentRune` propagation to know the immediate parent during the walk, or run a
dedicated validation pass over `TransformedPage`s. Keep the default
non-breaking (warn) except for the structurally-dependent set.

## References
- `packages/transform/src/engine.ts` (parentRune propagation)
- `packages/content/src/pipeline.ts`
- Depends on the contract shape from {% ref "SPEC-084" /%}

{% /work %}
