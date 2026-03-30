{% work id="WORK-073" status="done" priority="medium" complexity="simple" tags="plan, cli" milestone="v0.9.0" %}

# Add resolution validation checks to plan validate

Add three resolution-related checks to `refrakt plan validate` as specified in SPEC-027.

## Acceptance Criteria
- [x] Info-level check: work/bug items with status `done`/`fixed` but no `## Resolution` section
- [x] Warning-level check: items with a `## Resolution` section but status is not `done`/`fixed`
- [x] Warning-level check: files with multiple `## Resolution` headings
- [x] All three checks appear in `plan validate` output with correct severity levels
- [x] Unit tests cover each check

## Approach

Add a `checkResolutions()` function in `runes/plan/src/commands/validate.ts`. This depends on the scanner exposing `resolution` data (WORK-071), so the checks can use `entity.resolution` to determine presence. Alternatively, the validator could do its own raw-text scan of the file for `## Resolution` headings to avoid depending on the scanner change — simpler but slightly redundant.

## References
- {% ref "SPEC-027" /%}
- {% ref "WORK-071" /%} — scanner resolution parsing (dependency)

## Resolution

Completed: 2026-03-30

All three resolution checks implemented in `runes/plan/src/commands/validate.ts` with `checkResolutions()` function. Five unit tests cover each check type. All criteria verified met.

{% /work %}
