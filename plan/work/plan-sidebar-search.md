{% work id="WORK-045" status="done" priority="high" complexity="moderate" tags="plan, ux, behaviors" source="SPEC-015" %}

# Sidebar search and filter bar for plan site

Add a text input at the top of the sidebar that filters visible items in real-time. Supports plain text fuzzy matching across ID, title, tags, assignee, and milestone, plus structured `field:value` filter syntax matching the `{% backlog %}` rune.

## Acceptance Criteria

- [x] Text input appears at the top of the sidebar
- [x] Typing filters items by matching against ID, title, tags, assignee, milestone
- [x] `field:value` syntax works (e.g., `status:ready`, `priority:high`, `tags:css`)
- [x] Multiple filters combine with AND logic; multiple values for same field use OR
- [x] `Escape` clears the filter
- [x] `/` keyboard shortcut focuses the filter input
- [x] Filtering auto-expands matching groups (works with WORK-044)
- [x] Nav items include `data-tags`, `data-priority`, `data-severity`, `data-assignee`, `data-milestone` attributes

## Approach

Client-side behavior (~2KB). All data is already in the DOM via data attributes on nav items (added in WORK-038). No server round-trip needed. The behavior reads data attributes and filters by toggling visibility.

## References

- {% ref "SPEC-015" /%} (Plan Site UX at Scale — Feature 2)
- {% ref "WORK-038" /%} (nav region builder — provides data attributes)
- {% ref "WORK-044" /%} (collapsible groups — filtering interacts with collapse state)

{% /work %}
