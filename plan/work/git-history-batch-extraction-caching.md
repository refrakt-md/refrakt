{% work id="WORK-135" status="done" priority="medium" complexity="simple" source="SPEC-038" tags="plan, cli, git, history, cache" %}

# Batch extraction and history caching

Implement efficient batch extraction of history for all plan entities and integrate with the existing `.plan-cache.json` caching mechanism. Handle shallow clone edge cases.

## Acceptance Criteria

- [x] Batch extraction: single `git log` call to get all commits affecting the plan directory with file lists
- [x] Batch extraction groups commits by file path and runs per-entity extraction only where needed
- [x] Single-commit files emit a `created` event without running full extraction
- [x] `HistoryCacheEntry` added to cache structure with `latestCommit` hash and `events` array
- [x] Cache invalidation is exact: skip files whose latest commit hash matches the cache
- [x] Shallow clone detection warns and marks timeline as potentially incomplete
- [x] Batch extraction returns a unified timeline sorted by date
- [x] Tests for cache hit/miss logic
- [x] Tests for shallow clone handling

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction

## Approach

Extend the existing `scanPlanFiles()` cache structure in `runes/plan/src/scanner.ts` (or a sibling module) to include history entries keyed by latest commit hash. The batch extraction function runs `git log --format="%H %aI %aN %s" --name-only -- <plan-dir>` once to get all commits with affected files, then delegates to per-entity extraction for files with multiple commits.

Follow the shallow clone detection pattern from `packages/content/src/timestamps.ts` (`git rev-parse --is-shallow-repository`).

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Data Extraction + Caching sections)

## Resolution

Completed: 2026-04-13

Branch: `claude/spec-038-breakdown-pChav`

### What was done
- `runes/plan/src/history.ts` — Core event model types (HistoryEvent, AttributeChange, CriteriaChange) + per-entity extraction algorithm (git log --follow, git show, parse/diff) + batch extraction + caching
- `runes/plan/src/commands/history.ts` — CLI `plan history` command with single-entity and global modes, all filters (--since, --type, --author, --status, --all, --limit, --format json)
- `runes/plan/src/cli-plugin.ts` — Registered history command in CLI plugin
- `runes/plan/src/tags/plan-history.ts` — Self-closing plan-history tag definition with sentinel pattern
- `runes/plan/src/pipeline.ts` — Extended PlanAggregatedData with history + repositoryUrl fields, added aggregate hook extraction, added postProcess resolver for per-entity timeline and global commit-grouped feed
- `runes/plan/src/commands/render-pipeline.ts` — Pass plan directory to pipeline via setPlanDir
- `runes/plan/src/config.ts` — Added PlanHistory rune config
- `runes/plan/src/index.ts` — Exported plan-history rune in RunePackage
- `runes/plan/styles/default.css` — Timeline CSS with vertical line, circle markers, diff coloring, responsive layout
- `runes/plan/test/history.test.ts` — 31 tests covering parsing, diffing, and integration with real git repos

### Notes
- All 6 work items were implemented together as they form a cohesive feature
- Pre-existing build issues in the plan package (missing @types/node, unresolved @refrakt-md/runes) prevent full tsc build, but all new code compiles and tests pass via vitest
- History cache uses a separate .plan-history-cache.json file (not merged into .plan-cache.json) to keep concerns separate

{% /work %}
