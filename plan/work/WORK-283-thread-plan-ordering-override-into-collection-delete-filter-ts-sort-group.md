{% work id="WORK-283" status="ready" priority="medium" complexity="moderate" source="SPEC-072" tags="plan,ordering,collection,refactor" milestone="v0.16.0" %}

# Thread plan ordering override into collection; delete filter.ts sort/group

Finish the WORK-279 remainder: wire the plan plugin's **status** ordering override (actionable-first dashboard order, distinct from the `matches` lifecycle order) into the collection ordering, and delete the duplicated `filter.ts` `sortEntities`/`groupEntities`.

## Acceptance Criteria
- [ ] A plugin can declare `(type, field) → string[]` ordering overrides, and they reach `collection`/`relationships` via `embedConfig.orderings` (a Plugin-contract field threaded through `site.ts`, mirroring how tags/functions are threaded).
- [ ] The plan plugin registers only the overrides that diverge from `matches` — notably `work.status` (and bug status) in actionable-first order; priority/severity fall out of `matches` automatically.
- [ ] `plugins/plan/src/filter.ts` `sortEntities`/`groupEntities` are deleted; remaining internal callers use the shared `@refrakt-md/runes` helpers with an `Ordering` so plan dashboards keep their current order.
- [ ] Existing plan dashboards/backlog render in the same order as before (verify against current output).
- [ ] Completes WORK-279 (the edge contribution already landed; this is its ordering/dedup remainder) — mark WORK-279 done when this lands.

## Approach
Add an `orderings` field to the `Plugin` theme/contract (or a dedicated hook); `mergePlugins` + `site.ts` collect them into the `embedConfig.orderings` already consumed by `buildOrdering` (WORK-276). Delete `filter.ts` sort/group; repoint callers (or let WORK-284 remove those callers entirely with the backlog/decision-log collapse).

## Dependencies
WORK-276 (the ordering engine + `embedConfig.orderings` surface). Pairs with WORK-279.

## References
- {% ref "SPEC-072" /%} — Capability 3 (override + de-duplication).
- {% ref "ADR-012" /%} — ordering as the enabling parity item.

{% /work %}
