{% work id="WORK-044" status="draft" priority="high" complexity="moderate" tags="plan, ux, behaviors" %}

# Collapsible status groups in plan sidebar

Replace the flat entity list in the plan sidebar with status-grouped, collapsible sections. Items are grouped by status within each entity type, with active statuses expanded and terminal statuses collapsed by default. Collapse state persists in `localStorage`.

## Acceptance Criteria

- [ ] Sidebar items are grouped by status within each entity type
- [ ] Groups are collapsible via click on the group header
- [ ] Terminal statuses (`done`, `fixed`, `accepted`, `complete`, `superseded`, `deprecated`, `wontfix`, `duplicate`) are collapsed by default
- [ ] Active statuses (`in-progress`, `ready`, `review`, `confirmed`) are expanded by default
- [ ] Each group header shows a count badge (e.g., "In Progress (3)")
- [ ] Status ordering follows workflow progression (active statuses first)
- [ ] Collapse state persists across page navigation via `localStorage`
- [ ] Works in both `serve` and `build` modes

## Approach

The server renders the full grouped structure with data attributes. A client-side behavior (either in `@refrakt-md/behaviors` or plan-specific) adds toggle controls and manages collapse state. The nav region builder (WORK-038) emits the grouped structure.

## References

- SPEC-015 (Plan Site UX at Scale — Feature 1)
- WORK-038 (nav region builder — emits the structure this behavior enhances)
- WORK-039 (HTML adapter refactor — prerequisite infrastructure)

{% /work %}
