{% work id="WORK-135" status="ready" priority="medium" complexity="simple" source="SPEC-038" tags="plan, cli, git, history, cache" %}

# Batch extraction and history caching

Implement efficient batch extraction of history for all plan entities and integrate with the existing `.plan-cache.json` caching mechanism. Handle shallow clone edge cases.

## Acceptance Criteria

- [ ] Batch extraction: single `git log` call to get all commits affecting the plan directory with file lists
- [ ] Batch extraction groups commits by file path and runs per-entity extraction only where needed
- [ ] Single-commit files emit a `created` event without running full extraction
- [ ] `HistoryCacheEntry` added to cache structure with `latestCommit` hash and `events` array
- [ ] Cache invalidation is exact: skip files whose latest commit hash matches the cache
- [ ] Shallow clone detection warns and marks timeline as potentially incomplete
- [ ] Batch extraction returns a unified timeline sorted by date
- [ ] Tests for cache hit/miss logic
- [ ] Tests for shallow clone handling

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction

## Approach

Extend the existing `scanPlanFiles()` cache structure in `runes/plan/src/scanner.ts` (or a sibling module) to include history entries keyed by latest commit hash. The batch extraction function runs `git log --format="%H %aI %aN %s" --name-only -- <plan-dir>` once to get all commits with affected files, then delegates to per-entity extraction for files with multiple commits.

Follow the shallow clone detection pattern from `packages/content/src/timestamps.ts` (`git rev-parse --is-shallow-repository`).

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Data Extraction + Caching sections)

{% /work %}
