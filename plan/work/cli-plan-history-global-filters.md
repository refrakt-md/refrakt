{% work id="WORK-137" status="done" priority="medium" complexity="moderate" source="SPEC-038" tags="plan, cli, git, history" %}

# CLI `plan history` global mode and filters

Implement the global history feed and all filter flags for the `plan history` CLI command. The global mode shows recent events across all entities, grouped by commit.

## Acceptance Criteria

- [x] `plan history --limit 20` shows commit-grouped global feed
- [x] Commits that touch multiple entities are grouped as a single entry
- [x] Each commit entry shows date, short hash, and commit message
- [x] Entity changes within a commit are listed as compact summary lines
- [x] Criteria in global mode are summarised as counts (`☑ 8/8`) not individual items
- [x] `--since` filter maps to `git log --since` for efficient time-based filtering
- [x] `--since` accepts relative durations (`7d`, `30d`) and ISO dates
- [x] `--type` filter restricts to entity types (`work`, `spec`, `bug`, `decision`, comma-separated)
- [x] `--author` filter restricts to commits by a specific author (substring match)
- [x] `--status` filter shows only events where an entity transitioned to the given status
- [x] `--all` flag includes content-only events in global mode (omitted by default)
- [x] `--format json` outputs machine-readable JSON for global mode
- [x] `--limit` defaults to 20 when omitted

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction
- {% ref "WORK-135" /%} — Batch extraction
- {% ref "WORK-136" /%} — Single-entity CLI (shared command registration)

## Approach

Extend the `history` command handler to detect global mode (no entity ID argument). Use batch extraction to collect all events, then group by commit hash. Apply post-extraction filters for `--type`, `--author`, `--status`. The `--since` flag is passed through to `git log --since` for efficiency.

The commit-grouped formatter collects events that share a commit hash and renders them as a single entry with the commit message as header and entity summaries below.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (CLI: `plan history` — Global mode + Filters)

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
