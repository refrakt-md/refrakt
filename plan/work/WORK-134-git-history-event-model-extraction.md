{% work id="WORK-134" status="done" priority="high" complexity="moderate" source="SPEC-038" tags="plan, cli, git, history" %}

# Event model types and per-entity git history extraction

Define the core TypeScript types for the git-native entity history system and implement the per-entity extraction algorithm that derives structured lifecycle events from git commits.

This is the foundational piece that all other SPEC-038 work items depend on. The extraction algorithm walks a file's git history, parses each version's attributes/criteria/resolution, and diffs consecutive snapshots to emit typed `HistoryEvent` objects.

## Acceptance Criteria

- [x] `HistoryEvent` type defined with `kind` field: `created`, `attributes`, `criteria`, `resolution`, `content`
- [x] `AttributeChange` type with `field`, `from`, `to` (nullable for add/remove)
- [x] `CriteriaChange` type with `text` and `action` (`checked`, `unchecked`, `added`, `removed`)
- [x] Per-entity extraction: runs `git log --follow` to get commit list for a file
- [x] Per-entity extraction: runs `git show <hash>:<path>` to get file contents at each commit
- [x] Attribute parsing: extracts opening Markdoc tag attributes from line 1 via regex
- [x] Criteria parsing: collects `- [ ]` and `- [x]` checkbox lines from file content
- [x] Resolution detection: detects `## Resolution` section appearance/modification
- [x] Diff engine: walks commits oldest-to-newest, diffs consecutive snapshots, emits typed events
- [x] Content fallback: emits `content` event when file changed but no structured diff detected
- [x] Each event carries commit hash, date, author, and commit message
- [x] Tests for attribute diffing (add, remove, change attributes)
- [x] Tests for criteria diffing (check, uncheck, add, remove criteria)
- [x] Tests for resolution detection
- [x] Tests for content-only fallback events

## Approach

Create a new module `runes/plan/src/history.ts` with the extraction logic. The attribute parser is a simple regex on line 1 (`{% <type> key="value" ... %}`). The criteria parser collects checkbox lines. The diff engine walks pairs of consecutive versions.

Use `child_process.execSync` for git commands (matching existing patterns in `packages/content/src/timestamps.ts`). Parse git log output for commit metadata. For each commit, retrieve file contents via `git show`.

Export a `extractEntityHistory(filePath: string, planDir: string): HistoryEvent[]` function that other work items will consume.

## Dependencies

None — this is the foundational work item.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Event Model + Data Extraction sections)

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
