{% work id="WORK-115" status="ready" priority="medium" complexity="moderate" tags="transform, themes, runes" milestone="v1.0.0" source="SPEC-033" %}

# Migrate community package postTransform uses to declarative config

With WORK-110 through WORK-114 complete, convert the 5 `postTransform` uses identified in SPEC-033 to their declarative equivalents. Validate identical HTML output before and after each migration.

## Acceptance Criteria

- [ ] Beat rune (`runes/storytelling/src/config.ts`) — `postTransform` replaced with `valueMap`/`mapTarget` on the status modifier
- [ ] ComparisonRow rune (`runes/marketing/src/config.ts`) — `postTransform` replaced with `valueMap`/`mapTarget`
- [ ] Testimonial rune (`runes/marketing/src/config.ts`) — `postTransform` replaced with `repeat` on structure entry for star ratings
- [ ] `refrakt inspect` output is identical before and after for each migrated rune
- [ ] All existing tests pass
- [ ] CSS coverage tests pass (no selector regressions)
- [ ] The 4 remaining `postTransform` uses (genuinely complex cases) are untouched

## Approach

1. For each rune, capture the current `refrakt inspect` output as a baseline
2. Replace the `postTransform` with the equivalent declarative config
3. Compare inspect output to confirm identical HTML
4. Run full test suite after each migration

## References

- {% ref "SPEC-033" /%} (Validation section)
- {% ref "WORK-110" /%} (value mapping — enables Beat, ComparisonRow migration)
- {% ref "WORK-113" /%} (repeated elements — enables Testimonial migration)

{% /work %}
