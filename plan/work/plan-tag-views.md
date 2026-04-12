{% work id="WORK-047" status="done" priority="medium" complexity="moderate" tags="plan, ux, pipeline" source="SPEC-015" %}

# Tag-based cross-cutting view pages for plan site

Auto-generate pages that group entities by tag, assignee, or milestone. These appear in a "Views" section in the sidebar and use the `{% backlog %}` rune with appropriate filters.

## Acceptance Criteria

- [x] "By tag" view pages are generated when 3+ distinct tags exist
- [x] "By assignee" view pages are generated when 2+ distinct assignees exist
- [x] "By milestone" view pages are generated when 2+ milestones exist
- [x] Each view page uses `{% backlog %}` with the appropriate filter
- [x] A "Views" section appears in the sidebar with links to generated pages
- [x] View pages are generated during the aggregate pipeline phase (no manual authoring)
- [x] Count badges show how many entities match each grouping value

## Approach

During the aggregate phase, scan the entity registry for distinct tag/assignee/milestone values. For each value above the threshold, generate a synthetic page containing a `{% backlog %}` rune with the appropriate filter. Add these pages to the page index and sidebar nav.

## References

- {% ref "SPEC-015" /%} (Plan Site UX at Scale — Feature 4)
- {% ref "WORK-022" /%} (backlog rune — provides the filtering display)

{% /work %}
