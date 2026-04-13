{% work id="WORK-136" status="done" priority="high" complexity="simple" source="SPEC-038" tags="plan, cli, git, history" %}

# CLI `plan history` single-entity mode

Implement the `plan history <ID>` CLI subcommand for viewing the git-derived lifecycle timeline of a single plan entity.

## Acceptance Criteria

- [x] `plan history WORK-024` displays the entity's timeline in reverse chronological order
- [x] Each event shows date, structured changes, and short commit hash
- [x] Attribute changes display as `field: old → new`
- [x] Criteria changes display with ☑/☐ markers
- [x] Resolution events are shown when a Resolution section is added/modified
- [x] Content-only events are included for completeness
- [x] Sub-changes within an event (multiple attributes, multiple criteria) are indented
- [x] Entity title is displayed as a header line
- [x] `--format json` outputs machine-readable JSON
- [x] Command is registered in the plan CLI plugin
- [x] Error handling for unknown entity IDs

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction

## Approach

Add a `history` command handler in `runes/plan/src/commands/history.ts`. Register it in `runes/plan/src/cli-plugin.ts`. The handler resolves the entity ID to a file path using the existing scanner, then calls `extractEntityHistory()` and formats the output.

The formatter should produce the columnar format shown in the spec: date left-aligned, changes indented, commit hash right-aligned.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (CLI: `plan history` — Single-entity mode)

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
