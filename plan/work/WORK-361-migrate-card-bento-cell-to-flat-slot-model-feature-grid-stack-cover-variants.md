{% work id="WORK-361" status="ready" priority="high" complexity="complex" source="SPEC-091" tags="engine, runes, marketing, refactor" milestone="v0.20.0" %}

# Migrate card/bento-cell to flat-slot model; feature grid/stack + cover variants

Migrate `card`/`bento-cell` to the SPEC-081 flat-slot + base-`layout` model (prerequisite for the cover variant), migrate `feature`'s grid/stack conditional out of its transform into a `media-position` variant, and document the variants primitive.

## Acceptance Criteria
- [ ] `card` and `bento-cell` emit flat `data-name` slots and carry a base `layout` (grouping moved out of the transform), mirroring `recipe`.
- [ ] `feature`'s grid/stack conditional is migrated from its transform to a `media-position` variant (removing a flat-transform violation).
- [ ] `compoundVariants` is documented as a reserved future extension, not implemented.
- [ ] A theme-authoring "variants" section documents the primitive.

## Approach
Strip `contentDiv`/`mediaDiv` assembly in `card.ts`/`bento.ts`. SPEC-091 §5, §7; `plugins/marketing/src/tags/feature.ts`.

## References

- {% ref "SPEC-091" /%}

{% /work %}
