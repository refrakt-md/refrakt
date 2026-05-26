{% work id="WORK-281" status="ready" priority="medium" complexity="moderate" source="ADR-011" tags="plan,plan-site,collection,milestone,progress" milestone="v0.16.0" %}

# Milestone page via collection; render progress via the generic progress rune

Render a milestone's work via a `collection` in the milestone template (the link is the forward field `work.data.milestone`), replacing the rune-injected auto-backlog. Render the completion **progress** via the new generic `progress` rune (WORK-285) fed an aggregate the plan plugin writes onto the milestone entity — **not** via `plan-progress`, which is a status-count tally, not a bar.

## Acceptance Criteria
- [ ] The milestone detail template renders its work via `{% collection type="work,bug" filter="milestone:$item.id" group="status" sort="priority" %}` with a `card`/work-card partial.
- [ ] Status groups appear in actionable-first order (via WORK-283's `work.status` override; the `matches` lifecycle order is the fallback).
- [ ] The plan plugin's `aggregate` computes the criteria rollup per milestone (sum of `checkedCount` / `totalCount` over the milestone's work+bug) and writes it onto the milestone entity's `data` (e.g. `progressDone` / `progressTotal`).
- [ ] The milestone template renders the bar via the generic `progress` rune fed those fields (e.g. `{% progress value=$item.data.progressDone max=$item.data.progressTotal /%}`) — no progress markup baked into the milestone rune.
- [ ] No milestone work is rendered via the injected `buildMilestoneBacklog` path (its removal is WORK-282).
- [ ] The plan-site milestone page shows the same information as before (work grouped by status + a completion bar).

## Approach
Add the collection to the milestone render-template (WORK-280 establishes the template pattern). Move the rollup computation out of `buildMilestoneBacklog` (pipeline.ts:711) into the `aggregate` hook, writing the totals onto each milestone's `data` so the template can read them. Render via WORK-285's `progress` rune. (Correction from the original plan: `plan-progress` is a type×status tally, so it is not the home for a single milestone's bar.)

## Dependencies
WORK-280 (entity templates), WORK-283 (status ordering override), WORK-285 (generic `progress` rune).

## References
- {% ref "ADR-011" /%} — milestone work → collection; progress rollup relocation.

{% /work %}
