{% work id="WORK-046" status="done" priority="medium" complexity="moderate" tags="plan, ux, pipeline" source="SPEC-015" %}

# Enhanced plan dashboard with progress and milestone scoping

Improve the auto-generated dashboard to show project health at a glance: status count summaries, a blocked items callout, per-milestone grouping when multiple milestones exist, and a recent activity section.

## Acceptance Criteria

- [x] Dashboard shows a progress summary line per entity type (e.g., "35 work items: 12 done, 3 in progress, 7 ready, 2 blocked, 11 draft")
- [x] Status counts are color-coded using the existing status palette
- [x] Blocked items section with warning styling surfaces all `status: blocked` entities
- [x] When multiple milestones exist, work items and bugs are grouped by milestone with per-milestone progress
- [x] When one or zero milestones exist, flat layout is used (current behavior)
- [x] Recent activity section shows last 10 items by file modification time
- [x] Existing dashboard sections (active milestone, ready, in-progress, recent decisions) are preserved

## Approach

Extend the dashboard generation in `@refrakt-md/plan`'s aggregate pipeline phase. Progress summaries and milestone grouping are computed from the entity registry. Recent activity uses `mtime` from the file scanner.

Note: The dashboard page uses `generateDashboardContent()` which produces Markdoc content, not raw HTML. This approach is independent of WORK-050's renderer convergence — the dashboard generation creates content that flows through whatever renderer is active.

## References

- {% ref "SPEC-015" /%} (Plan Site UX at Scale — Feature 3)
- {% ref "WORK-039" /%} (HTML adapter refactor — prerequisite)

{% /work %}
