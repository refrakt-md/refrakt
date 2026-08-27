{% work id="WORK-514" status="done" priority="medium" complexity="moderate" source="SPEC-119" tags="plan, validation, lifecycle, dx" milestone="v0.30.0" pr="refrakt-md/refrakt#574" %}

# Lifecycle-drift validation — work-dependency and milestone-completion checks

Add the remaining v1 drift checks from {% ref "SPEC-119" /%} that key on dependency and milestone-membership evidence rather than the spec↔work edge: a work item still `blocked` after all its blockers finished, and a milestone marked `complete` while it still has open members. Complements the spec-side checks in {% ref "WORK-513" /%}, reusing the same helpers and reporting plumbing.

## Acceptance Criteria
- [x] `plan validate` emits `stale-blocked` (warning) for a work item with `status=blocked` whose `## Blocked by` targets are **all** achieving-terminal
- [x] `plan validate` emits `milestone-complete-with-open-work` (warning) for a milestone with `status=complete` that has ≥1 assigned item which is **non-terminal**
- [x] Both predicates use the `isTerminal`/`isAchieving` helpers from {% ref "SPEC-117" /%}; no status set is re-declared in `validate.ts`
- [x] `stale-blocked` reads dependency edges via the {% ref "SPEC-114" /%} directed `## Blocked by` model (not prose `{% ref %}` mentions or `## References`)
- [x] No warning fires for a milestone with zero assigned items, or a `blocked` item with no `## Blocked by` targets
- [x] `--strict` promotes the new warnings to errors
- [x] Each new issue `type` has a fixture-backed unit test (positive and negative case)

## Approach

Work↔work linkage is the SPEC-114 directed `## Blocked by` graph; milestone membership is the `milestone` attribute. Follow the check/reporting shape established in WORK-513 (shared helpers from `enums.ts`, same issue-emission path in `validate.ts`). These are the two non-spec v1 checks; the v2 set (`retired-spec-live-work`, `terminal-spec-no-work`, `false-ready`, `milestone-done-not-complete`) is deliberately deferred by SPEC-119 until the v1 warnings are proven non-noisy, and is out of scope here.

## References

- {% ref "SPEC-119" /%} — lifecycle-drift validation (this work item covers the work-dependency + milestone v1 checks)
- {% ref "SPEC-117" /%} — `isTerminal`/`isAchieving` helpers
- {% ref "SPEC-114" /%} — directional `## Blocked by` dependency model read by `stale-blocked`

## Resolution

Completed: 2026-07-24

Branch: `claude/v0-30-milestone-review-hg592h`

### What was done
- Added `stale-blocked` (reads the SPEC-114 `## Blocked by` graph via `buildBlockedByAdjacency`) and `milestone-complete-with-open-work`.
- The milestone check replaces the old `complete-milestone-open-item`, now keyed on `isTerminal` so a cancelled/superseded member does not falsely keep a milestone open.
- Reuses the SPEC-117 helpers and the WORK-513 reporting path; fixture-backed tests; `--strict` promotes to errors.

{% /work %}
