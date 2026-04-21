{% work id="WORK-074" status="done" priority="medium" complexity="moderate" tags="plan, cli" milestone="v1.0.0" source="SPEC-027" %}

# Display resolution metadata in plan status and plan serve

Show resolution data (completion date, PR link) in the `plan status` output and the `plan serve` dashboard.

## Acceptance Criteria
- [ ] `plan status` shows completion date and PR reference for recently done items (as shown in SPEC-027)
- [ ] `plan status --format json` includes resolution data in its output
- [ ] `plan serve` entity pages render the Resolution section with visual distinction (muted background, timestamp badge)
- [ ] Branch and PR values render as links in `plan serve` when patterns are recognised
- [ ] Unit tests for the status output formatting

## Approach

In `runes/plan/src/commands/status.ts`, when listing done items, pull `resolution.date` and `resolution.pr` from the entity and format them inline. For `plan serve`, update the render pipeline to style `## Resolution` sections distinctly — this likely means adding CSS and template logic in the serve command's rendering.

## References
- {% ref "SPEC-027" /%}
- {% ref "WORK-071" /%} — scanner resolution parsing (dependency)

{% /work %}
