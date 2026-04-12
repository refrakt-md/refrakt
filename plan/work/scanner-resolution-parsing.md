{% work id="WORK-126" status="done" priority="high" complexity="moderate" tags="plan, cli" milestone="v1.0.0" source="SPEC-027" %}

# Parse Resolution sections in the plan scanner

Extend the plan scanner to extract `## Resolution` sections from work item and bug files into a structured `resolution` field on `PlanEntity`.

## Acceptance Criteria
- [x] `PlanEntity` interface in `runes/plan/src/types.ts` gains an optional `resolution` field with `date`, `branch`, `pr`, and `body` subfields
- [x] `parseFile()` in `runes/plan/src/scanner.ts` extracts the Resolution section from the raw source when present
- [x] `Completed:` line is parsed into `resolution.date` (ISO date string)
- [x] `Branch:` line is parsed into `resolution.branch` (backticks stripped)
- [x] `PR:` line is parsed into `resolution.pr`
- [x] Remaining content goes into `resolution.body`
- [x] Files without a `## Resolution` section produce `resolution: undefined`
- [x] Unit tests cover: full resolution, minimal resolution (just a sentence), missing resolution, resolution with only some fields

## Approach

Add a `Resolution` interface to `types.ts`. In the scanner, after extracting criteria, locate `## Resolution` within the rune's line range and parse it using simple line-prefix matching as described in SPEC-027. The extraction should work on the raw source string (not the AST) since it's a convention-based section, similar to how `extractCriteria` works.

## References
- {% ref "SPEC-027" /%}

{% /work %}
