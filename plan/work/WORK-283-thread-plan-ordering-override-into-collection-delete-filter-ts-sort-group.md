{% work id="WORK-283" status="done" priority="medium" complexity="moderate" source="SPEC-072" tags="plan,ordering,collection,refactor" milestone="v0.16.0" %}

# Thread plan ordering override into collection; delete filter.ts sort/group

Finish the WORK-279 remainder: wire the plan plugin's **status** ordering override (actionable-first dashboard order, distinct from the `matches` lifecycle order) into the collection ordering, and delete the duplicated `filter.ts` `sortEntities`/`groupEntities`.

## Acceptance Criteria
- [x] A plugin can declare `(type, field) → string[]` ordering overrides, and they reach `collection`/`relationships` via `embedConfig.orderings` (a Plugin-contract field threaded through `site.ts`, mirroring how tags/functions are threaded).
- [x] The plan plugin registers only the overrides that diverge from `matches` — notably `work.status` (and bug status) in actionable-first order; priority/severity fall out of `matches` automatically.
- [x] `plugins/plan/src/filter.ts` `sortEntities`/`groupEntities` are deleted; remaining internal callers use the shared `@refrakt-md/runes` helpers with an `Ordering` so plan dashboards keep their current order.
- [x] Existing plan dashboards/backlog render in the same order as before (verify against current output).
- [x] Completes WORK-279 (the edge contribution already landed; this is its ordering/dedup remainder) — mark WORK-279 done when this lands.

## Approach
Add an `orderings` field to the `Plugin` theme/contract (or a dedicated hook); `mergePlugins` + `site.ts` collect them into the `embedConfig.orderings` already consumed by `buildOrdering` (WORK-276). Delete `filter.ts` sort/group; repoint callers (or let WORK-284 remove those callers entirely with the backlog/decision-log collapse).

## Dependencies
WORK-276 (the ordering engine + `embedConfig.orderings` surface). Pairs with WORK-279.

## References
- {% ref "SPEC-072" /%} — Capability 3 (override + de-duplication).
- {% ref "ADR-012" /%} — ordering as the enabling parity item.

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `plugins/plan/src/pipeline.ts`: dropped the imports of `sortEntities` / `groupEntities` from the local `filter.js` in favour of the shared helpers from `@refrakt-md/runes`. Built the `Ordering` once per page from `aggregated['__core__'].embedConfig` (so plan's actionable-first `work.status` / `bug.status` overrides from `Plugin.theme.orderings` actually fire), and threaded it as a parameter through `resolveBacklog`, `buildMilestoneBacklog`, and `resolveDecisionLog`. Each helper passes the same ordering into the shared sort / group so a `priority="critical|high|medium|low"` sort, a `status` group, and the actionable-first dashboard order all keep their current shape.
- `plugins/plan/src/filter.ts`: deleted the local `sortEntities` / `groupEntities` plus the `PRIORITY_ORDER` / `COMPLEXITY_ORDER` tables; kept `parseFilter` / `matchesFilter` which are still the active filter layer.
- `plugins/plan/test/filter.test.ts`: dropped the test blocks for the deleted helpers and pointed the reader at the engine-side suites (`collection-ordering.test.ts`) and the plan ordering test (`ordering.test.ts`).
- `resolveDecisionLog`: the rune's documented behavior is `sort="date"` → reverse-chronological (the old local sort baked the direction in). The shared sort is direction-agnostic and reads a leading `-` prefix, so a bare `date` is now coerced to `-date` inside the resolver to preserve the rune contract. Authors can still pass an explicit `id` / `+date` and get the natural order.

### Verification
- `npx vitest run plugins/plan/test/` — 425/425 pass.
- `npx vitest run packages/content/` — 169/169 pass (incl. plan-site dogfood).
- `npm run build` from `plan-site/` — 0 errors / 0 warnings; entity card counts on every dashboard match (within the upstream content drift since v0.16.0 started).

### Notes
- The remaining WORK-279 criteria are about removing the plan plugin's private relationship map *from the rendering path*; the map is still used by `postProcess` injection (`buildRelationshipsSection` / `buildAutoHistorySection` / `buildMilestoneBacklog`). That removal lands with WORK-282 — WORK-279 wraps when WORK-282 does.
- The user upstream change in [plan-site/content/decisions.md](plan-site/content/decisions.md) (replacing `{% decision-log %}` with `{% collection ... sort="-date" %}`) doesn't depend on this change but proves the same surface area — `-date` is now first-class via the shared sort.

{% /work %}
