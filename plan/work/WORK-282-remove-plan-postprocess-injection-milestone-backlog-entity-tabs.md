{% work id="WORK-282" status="ready" priority="high" complexity="moderate" source="ADR-011" tags="plan,pipeline,relationships,refactor" milestone="v0.16.0" %}

# Remove plan postProcess injection (milestone backlog + entity tabs)

Delete the plan plugin's `postProcess` injection now that the panels are composed at the template level (WORK-280/281): the `buildMilestoneBacklog` append and the automatic Overview/Relationships/History tab-wrapping of every plan entity. Completes WORK-279's "remove the private relationship maps from the rendering path."

## Acceptance Criteria
- [ ] `buildMilestoneBacklog` and its append branch are removed from `postProcess` (pipeline.ts:546-556).
- [ ] The auto tab-wrapping of entity bodies (Overview/Relationships/History, pipeline.ts:558+) is removed; entity pages get their supplementary panels from the render template instead (WORK-280).
- [ ] The private relationship map is no longer used for rendering (the graph + `relationships` rune cover it); dead code (`buildRelationshipsSection`, `buildAutoHistorySection`, the milestone backlog builders) is deleted.
- [ ] The `aggregate` hook still contributes edges (WORK-279) and still produces git history for `plan-history`.
- [ ] Plan-site entity pages render correctly via templates; no regression in the information shown.

## Approach
Strip the injection branches from `postProcess`; remove the now-unused builders. Keep `aggregate` (edge contribution + history extraction). Verify the plan-site (WORK-280/281 templates) still shows relationships + history + milestone work. This is the change that finally decouples plan rendering from the injection.

## Dependencies
WORK-280 (entity templates must exist first), WORK-281 (milestone collection), WORK-279 (edge contribution).

## References
- {% ref "ADR-011" /%} — drop the postProcess injection.

{% /work %}
