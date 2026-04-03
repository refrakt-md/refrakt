{% work id="WORK-086" status="done" priority="medium" complexity="simple" tags="plan, content, pipeline" milestone="v1.0.0" %}

# Consolidate Plan Scanner with Shared Git Timestamp Utility

> Ref: SPEC-029 Phase 4 (Plan Scanner Consolidation)

Depends on: WORK-083 (shared git timestamp utility)

## Summary

Refactor the plan scanner's `getGitMtimes()` in `runes/plan/src/scanner.ts` to use the shared git timestamp utility from `packages/content/`, eliminating duplicate git timestamp collection code. The `plan-activity` rune's `mtime` field will be sourced from the same data as `$file.modified`, ensuring consistency between the activity feed and individual rune attributes.

## Acceptance Criteria

- [x] `runes/plan/src/scanner.ts` imports and uses the shared timestamp utility from `packages/content/` instead of its own `getGitMtimes()` implementation
- [x] The `getGitMtimes()` function is removed from `scanner.ts`
- [x] The `mtime` field in scanner results is derived from the shared utility's `modified` value
- [x] `plan-activity` rune displays the same modification dates as `$file.modified` on individual plan runes
- [x] No functional change in plan-activity output (dates match previous behavior)
- [x] All existing plan scanner tests pass

## Approach

1. Add `@refrakt-md/content` as a dependency of `@refrakt-md/plan` (or extract the utility to a shared location both can import)
2. Replace `getGitMtimes()` calls in `scanner.ts` with the shared utility
3. Map the shared utility's output format to the scanner's expected `mtime` field
4. Verify plan-activity output is unchanged

## References

- SPEC-029 (Phase 4 — Plan Scanner Consolidation)
- WORK-083 (shared git timestamp utility — dependency)
- `runes/plan/src/scanner.ts` — current `getGitMtimes()` implementation

{% /work %}
