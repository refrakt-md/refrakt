{% work id="WORK-113" status="done" priority="medium" complexity="moderate" tags="transform, themes" milestone="v1.0.0" source="SPEC-033" %}

# Add repeated element generation to structure entries

Extend `StructureEntry` with a `repeat` field that generates N copies of a template element, with optional filled/unfilled distinction. Eliminates the testimonial rune's `postTransform` for star ratings.

## Acceptance Criteria

- [x] `StructureEntry` in `packages/transform/src/types.ts` has a `repeat` field with `count` (modifier name), `max` (cap, default 10), `filled` (optional modifier name), `element` (template), and `filledElement` (optional template)
- [x] The engine's `buildStructureElement` generates `count` copies when `repeat` is present
- [x] When `filled` is specified, the first N elements get `data-filled="true"` (or use `filledElement`), the rest get `data-filled="false"` (or use `element`)
- [x] The `max` cap prevents runaway generation
- [x] Non-numeric or missing count values produce zero elements (no crash)
- [x] Unit tests cover: basic repetition, filled/unfilled split, max cap, edge cases (0, negative, non-numeric)
- [x] TypeScript compiles cleanly
- [x] All existing tests pass

## Approach

1. Add the `repeat` interface to `StructureEntry` in types
2. In the engine's structure element building, detect `repeat` and generate child elements in a loop
3. Read count and filled values from the modifier map (already resolved at that point)
4. Apply the filled/unfilled logic
5. Write tests

## References

- {% ref "SPEC-033" /%} (Feature 3 — Repeated Elements)
- {% ref "WORK-112" /%} (slots should land first so repeat can target slots)

{% /work %}
