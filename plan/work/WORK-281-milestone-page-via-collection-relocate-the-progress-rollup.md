{% work id="WORK-281" status="ready" priority="medium" complexity="moderate" source="ADR-011" tags="plan,plan-site,collection,milestone" milestone="v0.16.0" %}

# Milestone page via collection; relocate the progress rollup

Render a milestone's work via a `collection` in the milestone page/template (the link is the forward field `work.data.milestone`), replacing the rune-injected auto-backlog. Move the aggregate progress rollup (checked/total criteria) out of `buildMilestoneBacklog` into `plan-progress` (or a formatter), since it's the one piece a plain collection can't compute.

## Acceptance Criteria
- [ ] The milestone detail template renders its work via `{% collection type="work,bug" filter="milestone:$item.id" group="status" sort="priority" %}` with a `card`/work-card partial.
- [ ] Status groups appear in the intended order (relies on WORK-283's status ordering override; until then, the `matches` lifecycle order is acceptable).
- [ ] The progress rollup (checked/total → bar) is produced by `plan-progress` (or a small formatter), not inside the milestone rune.
- [ ] No milestone work is rendered via the injected `buildMilestoneBacklog` path (its removal is WORK-282).
- [ ] The plan-site milestone page shows the same information as before (work grouped by status + a progress indicator).

## Approach
Add the collection to the milestone render-template (WORK-280 establishes the template pattern). Extract the rollup computation from `buildMilestoneBacklog` (pipeline.ts:711) into `plan-progress` so it can be placed on the milestone page independently.

## Dependencies
WORK-280 (entity templates), WORK-283 (status ordering override for correct group order).

## References
- {% ref "ADR-011" /%} — milestone work → collection; progress rollup relocation.

{% /work %}
