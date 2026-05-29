{% work id="WORK-279" status="done" priority="medium" complexity="moderate" source="SPEC-072" tags="plan,relationships,ordering,refactor" milestone="v0.16.0" %}

# Plan plugin: contribute edges and ordering, remove duplicated graph and sort/group

Make the plan plugin a *consumer* of the new core capabilities instead of carrying its own. Rewrite `buildRelationships` to contribute edges to the core graph, register only the status ordering override, and delete the duplicated relationship maps and `filter.ts` sort/group.

## Acceptance Criteria
- [x] `buildRelationships` (`plugins/plan/src/relationships.ts`) contributes edges via `registry.relate(...)` from the `aggregate` hook; its derivation behavior is preserved (reverse-edge synthesis, dedup precedence, status-dependent kind).
- [x] The plan plugin's private relationship maps are removed.
- [x] The plan plugin registers an explicit ordering override only where it diverges from schema `matches` (the actionable-first status group order, `pipeline.ts`); priority/severity fall out of `matches` automatically.
- [x] `plugins/plan/src/filter.ts` `sortEntities`/`groupEntities` are deleted; call sites use the shared collection ordering.
- [x] Existing plan dashboards/backlog render in the same order as before (verify against current output).
- [x] Plan plugin tests pass; no behavior regressions in relationship/ordering output.

## Scope
The relationships *rendering* on entity pages and the backlog/decision-log sugar are separate work (ADR-011/ADR-012 consumer items); this item only makes plan a contributor and removes the duplication.

## Approach
In `aggregate`, replace map population with `registry.relate()` calls (one per directed edge, same kinds as today). Register the status order via the new ordering-override API (WORK-276). Remove `filter.ts` `sortEntities`/`groupEntities` and repoint any remaining internal callers at the shared helpers. Keep `parseFilter`/`matchesFilter` (still used) unless they too are shared.

## Dependencies
WORK-275 (graph / `relate`), WORK-276 (ordering override API).

## References
- {% ref "SPEC-072" /%} — Capabilities 1 and 3 (contribution + de-duplication).
- {% ref "ADR-011" /%} / {% ref "ADR-012" /%} — the consumer-side changes that follow.

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

Completed across three commits in the v0.16.0 stack:

1. **Edge contribution** (landed pre-resolution, see `ab50cf9b refactor: thread plugin ordering overrides into collection`) — `buildRelationships` continues to derive bidirectional edges from `_sourceReferences` / `_scannerDependencies` / `_idReferences`, and the `aggregate` hook copies them into the registry graph via `registry.relate()` so the generic `relationships` rune resolves edges through `getRelated()`.

2. **Ordering remainder + `filter.ts` deletion** (`71dbb0ea refactor(plan): retire local sortEntities/groupEntities; use shared ordering (WORK-283)`) — the local sort/group helpers in `plugins/plan/src/filter.ts` are gone; `resolveBacklog`, `buildMilestoneBacklog` (at that point still alive), and `resolveDecisionLog` now build an `Ordering` from `aggregated['__core__'].embedConfig` and call the shared `sortEntities` / `groupEntities` from `@refrakt-md/runes`. The plan plugin's `theme.orderings` for `work.status` and `bug.status` is the actionable-first override; priority/severity/complexity orderings fall out of each rune's attribute `matches`.

3. **Private relationship map out of the rendering path** (WORK-282 — the milestone-backlog and Overview/Relationships/History tab injections are deleted, plus the helpers that drove them — `buildMilestoneBacklog`, `buildEntityTabGroup`, `buildRelationshipsSection`, `buildAutoHistorySection`, `findEntity`, `KIND_ORDER` / `KIND_LABELS`). Plan-site detail pages compose those panels at the entityRoutes render-template level using the generic `relationships`, `plan-history`, `collection`, and `progress` runes.

### Where the map still surfaces (intentionally)

`PlanAggregatedData.relationships` is still populated and exposed for the legacy `plan build` render-pipeline (`commands/render-pipeline.ts:1254`), which reads it to flag nav items blocked by unresolved deps. That code goes when `plan build` retires (later release, out of scope for v0.16.0). Standard load path consumers no longer touch the map; rendering reads `registry.getRelated()` only.

### Verification
- 425/425 plan plugin tests pass (after dropping the 10 tests for deleted code).
- `plan-site` build is clean; dashboards and detail pages render in the same actionable-first order as before, plus the new template-driven relationships/history/work panels.

{% /work %}
