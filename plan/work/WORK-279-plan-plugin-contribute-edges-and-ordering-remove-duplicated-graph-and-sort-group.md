{% work id="WORK-279" status="ready" priority="medium" complexity="moderate" source="SPEC-072" tags="plan,relationships,ordering,refactor" milestone="v0.16.0" %}

# Plan plugin: contribute edges and ordering, remove duplicated graph and sort/group

Make the plan plugin a *consumer* of the new core capabilities instead of carrying its own. Rewrite `buildRelationships` to contribute edges to the core graph, register only the status ordering override, and delete the duplicated relationship maps and `filter.ts` sort/group.

## Acceptance Criteria
- [ ] `buildRelationships` (`plugins/plan/src/relationships.ts`) contributes edges via `registry.relate(...)` from the `aggregate` hook; its derivation behavior is preserved (reverse-edge synthesis, dedup precedence, status-dependent kind).
- [ ] The plan plugin's private relationship maps are removed.
- [ ] The plan plugin registers an explicit ordering override only where it diverges from schema `matches` (the actionable-first status group order, `pipeline.ts`); priority/severity fall out of `matches` automatically.
- [ ] `plugins/plan/src/filter.ts` `sortEntities`/`groupEntities` are deleted; call sites use the shared collection ordering.
- [ ] Existing plan dashboards/backlog render in the same order as before (verify against current output).
- [ ] Plan plugin tests pass; no behavior regressions in relationship/ordering output.

## Scope
The relationships *rendering* on entity pages and the backlog/decision-log sugar are separate work (ADR-011/ADR-012 consumer items); this item only makes plan a contributor and removes the duplication.

## Approach
In `aggregate`, replace map population with `registry.relate()` calls (one per directed edge, same kinds as today). Register the status order via the new ordering-override API (WORK-276). Remove `filter.ts` `sortEntities`/`groupEntities` and repoint any remaining internal callers at the shared helpers. Keep `parseFilter`/`matchesFilter` (still used) unless they too are shared.

## Dependencies
WORK-275 (graph / `relate`), WORK-276 (ordering override API).

## References
- {% ref "SPEC-072" /%} — Capabilities 1 and 3 (contribution + de-duplication).
- {% ref "ADR-011" /%} / {% ref "ADR-012" /%} — the consumer-side changes that follow.

{% /work %}
