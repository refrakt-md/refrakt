{% work id="WORK-343" status="ready" priority="medium" complexity="moderate" source="SPEC-076" milestone="v0.19.0" tags="aggregation,plan,runes" %}

# Aggregate milestone filter and per-type achievement status

Two extensions to `aggregate` that the plan-progress decomposition ({% ref "WORK-296" /%})
needs to be a faithful, override-friendly replacement: scoping a rollup to a
milestone, and recognizing that "done" differs per entity type (work: done,
bug: fixed, spec/decision: accepted).

## Acceptance Criteria
- [ ] `aggregate` (and the plan sugars that wrap it) accept a milestone scope so a rollup can be limited to one milestone's entities.
- [ ] The achievement subset (the `value=` clause) can express per-type "done" statuses, so a mixed-type rollup counts each type's completion correctly.
- [ ] `$item.value` / `$item.percent` reflect the per-type achievement mapping.
- [ ] Tests cover: milestone-scoped rollup, mixed-type achievement, and the unscoped default.

## Approach
Milestone scope is likely a filter clause passthrough (`filter="milestone:v0.19.0"`)
surfaced as a friendlier attribute. Per-type achievement needs the `value`
clause to vary by type — either a small per-type map in the resolver or a
domain lookup from each type's schema. Lands under SPEC-076's "future
extensions"; coordinate with WORK-296 so plan-progress consumes it.

## References
- `packages/runes/src/tags/aggregate.ts`, `packages/runes/src/aggregate-resolve.ts`
- {% ref "SPEC-076" /%}, unblocks the full scope of {% ref "WORK-296" /%}

{% /work %}
