{% work id="WORK-496" status="done" priority="medium" complexity="moderate" milestone="v0.28.0" source="SPEC-049" tags="plan, traceability, pr, work, bug" pr="refrakt-md/refrakt#565" %}

# Add pr attribute to work and bug runes

Promote PR references from unstructured resolution prose to a first-class, validated, queryable attribute so traceability rollups become possible.

## Acceptance Criteria
- [x] `work` and `bug` runes accept an optional, multi-valued (comma-separated) `pr` attribute matching `<org>/<repo>#<number>`
- [x] `pr` added to `ALLOWED_ATTRS` for `work` and `bug`
- [x] `plan validate` errors on malformed `pr` values; does **not** warn on a missing `pr` in v1
- [x] `plan.update` MCP tool and `refrakt plan update` accept `pr` with the same validation
- [x] The resolution parser continues to read the legacy `PR:` line, but the `pr` attribute takes precedence
- [x] Tests cover format validation, multi-value parsing, and legacy `PR:` fallback

## References
- {% ref "SPEC-049" /%} — spec (New attributes, CLI / MCP changes)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- `work`/`bug` accept multi-valued `pr` (`ALLOWED_ATTRS`, schema, MCP, CLI). `validate` errors on malformed pr, never on absence. Legacy `PR:` resolution line still parsed as fallback.
- Tests: format validation, multi-value, legacy fallback.

{% /work %}
