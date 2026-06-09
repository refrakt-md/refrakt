{% work id="WORK-358" status="ready" priority="critical" complexity="moderate" source="SPEC-091" tags="engine, runes, config, architecture" milestone="v0.20.0" %}

# Engine config variants: RuneConfig.variants type + axis validation

Add the `variants` field to `RuneConfig` — modifier-keyed config deltas — and validate at config load that every variant axis is a declared modifier. This is the foundational type + validation layer for engine config variants.

## Acceptance Criteria
- [ ] `RuneConfig.variants?: Record<modifier, Record<value, Partial<RuneConfig>>>` exists in `packages/transform/src/types.ts`.
- [ ] A `variants` axis with no matching `modifiers` entry is a config error at load.
- [ ] A delta may override assembly/decoration fields (`layout`/`structure`/`styles`/`contentWrapper`/`staticModifiers`/`autoLabel`/`editHints`) but not identity fields (`block`/modifier axes/`sections` keys); the allow-list is enforced.

## Approach
Mirror the CVA/Tailwind-variants shape but drop the predicate DSL and `defaultVariants` — the axis is an existing modifier. See SPEC-091 §1, §4.

## References

- {% ref "SPEC-091" /%}

{% /work %}
