{% work id="WORK-282" status="done" priority="high" complexity="moderate" source="ADR-011" tags="plan,pipeline,relationships,refactor" milestone="v0.16.0" %}

# Remove plan postProcess injection (milestone backlog + entity tabs)

Delete the plan plugin's `postProcess` injection now that the panels are composed at the template level (WORK-280/281): the `buildMilestoneBacklog` append and the automatic Overview/Relationships/History tab-wrapping of every plan entity. Completes WORK-279's "remove the private relationship maps from the rendering path."

## Acceptance Criteria
- [x] `buildMilestoneBacklog` and its append branch are removed from `postProcess` (pipeline.ts:546-556).
- [x] The auto tab-wrapping of entity bodies (Overview/Relationships/History, pipeline.ts:558+) is removed; entity pages get their supplementary panels from the render template instead (WORK-280).
- [x] The private relationship map is no longer used for rendering (the graph + `relationships` rune cover it); dead code (`buildRelationshipsSection`, `buildAutoHistorySection`, the milestone backlog builders) is deleted.
- [x] The `aggregate` hook still contributes edges (WORK-279) and still produces git history for `plan-history`.
- [x] Plan-site entity pages render correctly via templates; no regression in the information shown.

## Approach
Strip the injection branches from `postProcess`; remove the now-unused builders. Keep `aggregate` (edge contribution + history extraction). Verify the plan-site (WORK-280/281 templates) still shows relationships + history + milestone work. This is the change that finally decouples plan rendering from the injection.

## Dependencies
WORK-280 (entity templates must exist first), WORK-281 (milestone collection), WORK-279 (edge contribution).

## References
- {% ref "ADR-011" /%} — drop the postProcess injection.

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `plugins/plan/src/pipeline.ts` (postProcess) — deleted the two injection branches: the milestone auto-backlog append for `data-rune="milestone"` and the Overview/Relationships/History tab-wrap for every PLAN_RUNE_TYPES tag. plan's `postProcess` is now strictly per-rune sentinel resolution (backlog / decision-log / plan-progress / plan-activity / plan-history) — no more renderable mutation targeting other runes' tags.
- `plugins/plan/src/pipeline.ts` — deleted the now-dead helpers: `buildMilestoneBacklog`, `buildEntityTabGroup`, `buildRelationshipsSection`, `buildAutoHistorySection`, the `findEntity` lookup, and the `KIND_ORDER` / `KIND_LABELS` constants those used. Roughly 250 LOC removed.
- `plugins/plan/src/index.ts` — dropped the `behaviors` registration for `'milestone-backlog': tabsBehavior` and `'plan-entity-tabs': entityTabsBehavior`. Both data-rune wrappers were only emitted by the injection, so the behaviors were unreachable after the deletion.
- `plugins/plan/src/entity-tabs-behavior.ts` — deleted (only consumer was the registration above).
- `plugins/plan/src/commands/plan-behaviors.ts` (bespoke `plan build` bundle entrypoint) — trimmed to just `initRuneBehaviors` + `initLayoutBehaviors`. The behaviors it used to register pointed at wrappers that no longer exist. `plan build` is already deprecated (WORK-273) so this is housekeeping for the still-running tests that touch the bundle.
- `plugins/plan/test/pipeline.test.ts` — removed the entire `planPipelineHooks.postProcess — milestone auto-backlog` describe block (7 tests, ~223 lines of assertions against `rf-milestone__backlog`, `rf-milestone__progress`, the tab structure, etc.) and the three rendering-injection tests inside the `source attribute and implements relationships` block (`injects implements/implemented-by into relationships section`, `renders informed-by decisions as decision entries on spec page`, `decision informs shows on decision page as Informs link`). The eight data-layer tests in that block survive — they verify the registry edge contribution (via `planData.relationships`) which still functions and still powers `registry.relate()`.

### What's still alive on purpose
- `PlanAggregatedData.relationships` is kept (with an updated comment) because the legacy `plan build` render-pipeline (`commands/render-pipeline.ts:1254`) still reads it to mark nav items blocked by unresolved deps. Retiring `plan build` (a later release, out of scope for v0.16.0) lets it go.
- `_idReferences` / `_sourceReferences` / `_scannerDependencies` stay — they're the input to `buildRelationships`, which still runs in `aggregate` to feed `registry.relate()` so the generic `relationships` rune resolves edges via `getRelated()`.
- Git history extraction in `aggregate` and the `plan-history` rune's resolver still ship.

### Verification
- `plan-site` build: 0 errors / 0 warnings.
- `/milestones/v0.16.0/`: page now has only `## Work` (with the progress bar + 26-card collection), `## Relationships`, `## History` — no `rf-milestone__backlog`, no `data-rune="milestone-backlog"`, no `rf-plan-entity-tabs`, no `rf-plan-relationships`. Progress reads `73/146`.
- `/work/WORK-272/` and `/specs/SPEC-071/`: no leftover `rf-plan-entity-tabs` / `rf-plan-relationships` markup. Relationships render via the SPEC-072 `relationships` rune, history via `plan-history`.
- 425/425 plan plugin tests pass (after dropping the 10 tests for deleted code).
- 169/169 content tests pass; dogfood real-build test passes.

### Closes WORK-279
With the private relationship map no longer driving rendering, all WORK-279 criteria are now satisfied:
- `buildRelationships` contributes edges to the registry graph via `registry.relate()` (landed earlier).
- The plan plugin registers status ordering overrides only where they diverge from schema `matches` (WORK-283).
- `plugins/plan/src/filter.ts` `sortEntities` / `groupEntities` are deleted (WORK-283).
- Plan dashboards and the dogfood entity pages render in the expected order.
- Plan plugin tests pass.

Marking WORK-279 done in the same transition.

### Leftover lumina CSS
`packages/lumina/styles/runes/plan-relationships.css` and `plan-entity-tabs.css` style markup that's no longer emitted. They're dead but harmless. Removing them is theme-layer cleanup, not a plan-plugin concern; can roll into a future contracts/CSS audit.

{% /work %}
