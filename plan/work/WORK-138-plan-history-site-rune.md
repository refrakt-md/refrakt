{% work id="WORK-138" status="done" priority="medium" complexity="moderate" source="SPEC-038" tags="plan, runes, pipeline, git, history" %}

# `plan-history` site rune — tag definition and pipeline hooks

Implement the `plan-history` Markdoc tag as a self-closing aggregation rune following the established plan rune pattern (sentinel + meta tags + placeholder → aggregate → postProcess resolution). Supports both per-entity and global feed modes.

## Acceptance Criteria

- [x] Tag definition in `runes/plan/src/tags/plan-history.ts` with attributes: `id`, `limit`, `type`, `since`, `group`
- [x] Self-closing tag stores parameters as meta tags and emits sentinel marker
- [x] Rune config added to `runes/plan/src/config.ts` with block name `plan-history`
- [x] Rune exported in `runes/plan/src/index.ts` RunePackage
- [x] Aggregate hook extracts history data and adds to `PlanAggregatedData`
- [x] PostProcess hook detects sentinel and resolves per-entity timeline HTML
- [x] PostProcess hook detects sentinel and resolves global commit-grouped feed HTML
- [x] Per-entity HTML follows BEM structure from spec: `rf-plan-history__events`, `__event`, `__date`, `__hash`, `__changes`, `__change`, `__field`, `__value`, `__criteria`
- [x] Global feed HTML includes `rf-plan-history--global` modifier and `__commit-message`, `__entity-summary` elements
- [x] Attribute values use `data-type="add|remove"` for diff styling
- [x] Criteria collapse: show first 3, collapse rest with "+N more criteria" in per-entity mode
- [x] Auto-injection: postProcess appends History section to entity pages (when enabled) for entities with >1 commit
- [x] Commit hashes link to repository URL when configured (parsed from `git remote get-url origin`)

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction
- {% ref "WORK-135" /%} — Batch extraction and caching

## Approach

Follow the exact pattern used by `plan-activity` and `plan-progress`:
1. Tag definition exports sentinel constant and uses `createContentModelSchema` with `selfClosing: true`
2. Extend `PlanAggregatedData` interface with `history: Map<string, HistoryEvent[]>` and `globalHistory` fields
3. In aggregate hook, run batch extraction and populate history data
4. In postProcess, detect `plan-history` sentinel, read params, build timeline HTML using Markdoc `Tag` objects
5. Auto-injection follows the same pattern as the existing auto-relationships injection

Repository URL parsing: use `git remote get-url origin` at aggregate time, with a config override field.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Site Rune + Rendering sections)

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
