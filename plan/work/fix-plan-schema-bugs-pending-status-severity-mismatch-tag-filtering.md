{% work id="WORK-127" status="done" priority="high" complexity="simple" source="SPEC-037" tags="plan, cli, validation" %}

# Fix plan schema bugs: pending status, severity mismatch, tag filtering

Four small bugs identified in the SPEC-037 audit that need immediate fixes.

1. **`pending` status missing from work schema** — 13 work items use it, `plan/CLAUDE.md` documents it, but `work.ts` doesn't include it in the status enum.
2. **Severity values mismatch** — `bug.ts` says `cosmetic`, `validate.ts` says `trivial`. Align on `cosmetic` (avoids collision with the complexity scale).
3. **Complexity validation missing** — `validate.ts` checks status, priority, and severity but not complexity. Invalid values like `high` or `low` pass silently.
4. **Tag filtering is substring-based** — `npx refrakt plan next --tag foo` matches `foo-bar` because the filter does a substring check instead of exact term matching.

## Acceptance Criteria

- [x] `pending` added to work schema status enum in `runes/plan/src/tags/work.ts`
- [x] Severity enum aligned: both `bug.ts` and `validate.ts` use `cosmetic` (not `trivial`)
- [x] `validate` checks complexity values against the valid set (`trivial`, `simple`, `moderate`, `complex`, `unknown`)
- [x] Tag filtering splits on comma, trims whitespace, and matches terms exactly
- [x] Tests cover all four fixes

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening (Part 1: Bug Fixes)

## Resolution

Completed: 2026-04-12

Branch: `claude/spec-037-breakdown-docs-Whj40`

### What was done
- Added `pending` to work.ts statusValues and update.ts VALID_STATUS
- Changed validate.ts VALID_SEVERITIES from `trivial` to `cosmetic`
- Added VALID_COMPLEXITIES set and complexity check in checkInvalidAttributes()
- Tag filtering was already correct (exact match via split+includes)
- Added 4 new tests: cosmetic severity, invalid complexity, valid complexity, pending status

{% /work %}
