{% work id="WORK-044" status="done" priority="high" complexity="moderate" tags="plan, ux, behaviors" source="SPEC-015" %}

# Collapsible status groups in plan sidebar

Replace the flat entity list in the plan sidebar with status-grouped, collapsible sections. Items are grouped by status within each entity type, with active statuses expanded and terminal statuses collapsed by default. Collapse state persists in `localStorage`.

## Acceptance Criteria

- [x] Sidebar items are grouped by status within each entity type
- [x] Groups are collapsible via click on the group header
- [x] Terminal statuses (`done`, `fixed`, `accepted`, `complete`, `superseded`, `deprecated`, `wontfix`, `duplicate`) are collapsed by default
- [x] Active statuses (`in-progress`, `ready`, `review`, `confirmed`) are expanded by default
- [x] Each group header shows a count badge (e.g., "In Progress (3)")
- [x] Status ordering follows workflow progression (active statuses first)
- [x] Collapse state persists across page navigation via `localStorage`
- [x] Works in both `serve` and `build` modes

## Approach

The server renders the full grouped structure with data attributes. A client-side behavior (either in `@refrakt-md/behaviors` or plan-specific) adds toggle controls and manages collapse state. The nav region builder (WORK-038) emits the grouped structure.

## References

- {% ref "SPEC-015" /%} (Plan Site UX at Scale — Feature 1)
- {% ref "WORK-038" /%} (nav region builder — emits the structure this behavior enhances)
- {% ref "WORK-039" /%} (HTML adapter refactor — prerequisite infrastructure)

{% /work %}
