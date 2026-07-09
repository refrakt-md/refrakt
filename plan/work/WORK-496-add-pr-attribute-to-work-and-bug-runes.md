{% work id="WORK-496" status="ready" priority="medium" complexity="moderate" milestone="v0.28.0" source="SPEC-049" tags="plan, traceability, pr, work, bug" %}

# Add pr attribute to work and bug runes

Promote PR references from unstructured resolution prose to a first-class, validated, queryable attribute so traceability rollups become possible.

## Acceptance Criteria
- [ ] `work` and `bug` runes accept an optional, multi-valued (comma-separated) `pr` attribute matching `<org>/<repo>#<number>`
- [ ] `pr` added to `ALLOWED_ATTRS` for `work` and `bug`
- [ ] `plan validate` errors on malformed `pr` values; does **not** warn on a missing `pr` in v1
- [ ] `plan.update` MCP tool and `refrakt plan update` accept `pr` with the same validation
- [ ] The resolution parser continues to read the legacy `PR:` line, but the `pr` attribute takes precedence
- [ ] Tests cover format validation, multi-value parsing, and legacy `PR:` fallback

## References
- {% ref "SPEC-049" /%} — spec (New attributes, CLI / MCP changes)

{% /work %}
