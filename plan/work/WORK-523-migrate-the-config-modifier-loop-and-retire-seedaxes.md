{% work id="WORK-523" status="pending" priority="medium" complexity="complex" source="SPEC-122" tags="engine, transform, refactor" milestone="v0.30.0" %}

# Migrate the config-modifier loop and retire seedAxes

Make step 1's generic config-modifier resolution — plus `contextModifiers` (1b) and `staticModifiers` (1c) — facets, and delete `FacetInput.seedAxes` once nothing needs it. This is the last structural migration and the one that removes the migration scaffolding: every `after` reference resolves to a real facet, and the registry's dependency graph becomes complete rather than partly seeded.

## Acceptance Criteria

- [ ] `modifiers`, `context-modifiers` and `static-modifiers` are facets; steps 1, 1b and 1c are gone from `transformRune`
- [ ] `valueMap` / `mapTarget` / `noBemClass` and the present-but-empty (`renderWhenEmpty`) case all behave unchanged
- [ ] `attrModifierNames` — used to strip attribute-source modifiers from pass-through output — is carried by the facet resolution rather than a local
- [ ] Every axis previously seeded (`media-position`, `content-place`, `color-scheme`) is supplied by a facet; consumers are unchanged because a facet value already shadows the seed
- [ ] `FacetInput.seedAxes`, the `seeded` option on `orderFacets`, and `SEEDED_AXES` are deleted
- [ ] `{% ref "SPEC-091" /%}` config variants still resolve before the facet pass, since they rewrite the config the facets read
- [ ] Class-string order and `modifierValues` key insertion order are unchanged
- [ ] All 630 pre-existing transform tests pass **unmodified**, including `value-mapping`, `variants`, `fields` and `context-modifiers`
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

This is the riskiest single migration in the spec: every rune goes through the modifier loop, and its edge cases (value mapping, mapped targets, suppressed BEM classes, present-but-empty values) are subtle. It is scheduled last for exactly that reason — by this point the interface is settled and the remaining facets are proven against it.

Ordering is the main hazard. The modifier facets must run first so their axes are available to everything else, and their BEM classes must land at the front of the class string. Registration order handles both, but verify against a rune that combines config modifiers, context modifiers, static modifiers, a tint and a background.

Watch for the interaction with variants: `resolveVariantConfig` rewrites `config` from modifier values *before* the rest of the transform reads it, so it must stay ahead of the facet pass rather than becoming a facet itself.

## Blocked by
- {% ref "WORK-519" /%}
- {% ref "WORK-520" /%}
- {% ref "WORK-521" /%}
- {% ref "WORK-522" /%}

## Blocks
- {% ref "WORK-525" /%}

## References

- {% ref "SPEC-122" /%} — facet registry (the spec this work item realizes)
- {% ref "SPEC-091" /%} — config variants, resolved ahead of the facet pass
- {% ref "SPEC-082" /%} — the typed field-data channel the modifier loop reads

{% /work %}
