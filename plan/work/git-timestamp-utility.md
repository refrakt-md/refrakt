{% work id="WORK-083" status="done" priority="high" complexity="moderate" tags="content, pipeline" milestone="v1.0.0" source="SPEC-029" %}

# Create Shared Git Timestamp Utility

> Ref: SPEC-029 Phase 1 (File-Derived Timestamps for Runes)

## Summary

Create a shared utility in `packages/content/` that batch-collects git timestamps (created and modified) for all files in a content directory. This replaces the per-package approach used by `runes/plan/src/scanner.ts:getGitMtimes()` with a general-purpose solution available to the entire content pipeline.

## Acceptance Criteria

- [x] New module in `packages/content/` exports a function (e.g. `getGitTimestamps`) that returns `Map<string, { created: string; modified: string }>` for all files under a given directory
- [x] Uses batch `git log` commands (not per-file) for both created and modified timestamps
- [x] Modified timestamp derived from `git log --format="%at" --name-only --diff-filter=ACMR HEAD`
- [x] Created timestamp derived from `git log --format="%at" --name-only --diff-filter=A --reverse HEAD`
- [x] Timestamps normalized to ISO 8601 date strings (`YYYY-MM-DD`)
- [x] Falls back to `fs.stat()` (`birthtimeMs` / `mtimeMs`) when git data is unavailable for a file
- [x] Detects shallow clones via `git rev-parse --is-shallow-repository` and omits or marks `created` as unreliable
- [x] Handles non-git directories gracefully (falls back entirely to fs.stat)
- [x] Results cached in memory for the duration of a single `loadContent()` call (no cross-build caching needed)
- [x] Unit tests covering: normal git repo, shallow clone detection, non-git fallback, date formatting

## Approach

1. Create `packages/content/src/timestamps.ts` with the batch git timestamp collection logic
2. Reuse the proven pattern from `runes/plan/src/scanner.ts:getGitMtimes()`, extended to also capture creation times
3. Parse git log output into a `Map<string, { created: number; modified: number }>` keyed by relative file path
4. Add fs.stat fallback for files missing from git history
5. Export a high-level function that returns formatted ISO date strings

## References

- {% ref "SPEC-029" /%} (Phase 1 — Git Timestamp Utility)
- `runes/plan/src/scanner.ts` — existing `getGitMtimes()` implementation to draw from

{% /work %}
