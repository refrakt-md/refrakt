{% work id="WORK-139" status="done" priority="low" complexity="simple" source="SPEC-038" tags="plan, css, history" %}

# `plan-history` CSS rendering

Style the `plan-history` rune with a vertical timeline layout following the design conventions established by the `timeline` rune (connected line, circle markers) and the `diff` rune (add/remove coloring).

## Acceptance Criteria

- [x] `.rf-plan-history` base styles: vertical timeline with left border line and circle markers
- [x] Filled circle markers for events with structured changes, open circles for creation events
- [x] `<time>` elements styled consistently with the timeline rune conventions
- [x] `<code>` commit hash styled monospace and subdued
- [x] Attribute change values use `data-type="add|remove"` with diff rune background tints
- [x] Status transitions use sentiment colour system (done=positive, blocked=negative)
- [x] `.rf-plan-history--global` modifier styles for commit-grouped feed
- [x] `.rf-plan-history__commit-message` and `__entity-summary` styled for global mode
- [x] Criteria collapse "+N more criteria" styled as subtle expandable summary
- [x] Responsive: timeline readable on mobile viewports
- [x] CSS uses design tokens (`--rf-color-*`, `--rf-radius-*`, etc.), no hard-coded values
- [x] CSS added to plan package styles (`runes/plan/styles/`)

## Dependencies

- {% ref "WORK-138" /%} — Site rune implementation (defines the HTML structure to style)

## Approach

Add CSS to `runes/plan/styles/default.css` (or a new `plan-history.css` imported from it). Reference the timeline rune's proportions (2px border, 0.75rem markers, left-indented content) and the diff rune's data-attribute color conventions. Use existing plan design tokens where available.

The BEM selectors to style are defined by the HTML structure in SPEC-038's Rendering section.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Rendering section)

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
