{% work id="WORK-048" status="done" priority="low" complexity="simple" tags="plan, ux, behaviors" source="SPEC-015" %}

# Keyboard navigation for plan site

Add keyboard shortcuts for fast navigation: `/` to focus search, `j`/`k` to move between sidebar items, `Enter` to navigate, `[`/`]` to jump between entity type groups, `o` to toggle collapse, `Escape` to clear.

## Acceptance Criteria

- [x] `/` focuses the search/filter bar
- [x] `Escape` clears filter and unfocuses search bar
- [x] `j`/`k` moves to next/previous item in sidebar
- [x] `Enter` navigates to the focused item
- [x] `[`/`]` jumps to previous/next entity type group
- [x] `o` toggles collapse of the focused group
- [x] Visual focus indicator matches the active link style
- [x] Shortcuts don't fire when typing in the search input (except Escape)

## Approach

A `keyboard-nav` behavior. Sidebar items get `tabindex` attributes. The behavior manages a virtual focus cursor and delegates to existing collapse/filter behaviors.

Once WORK-050 converges the plan renderer with the shared layout engine, this behavior can be registered in the `planLayout.behaviors` array (like `mobile-menu` and `search` in `docsLayout`), removing the need for inline script injection.

## References

- {% ref "SPEC-015" /%} (Plan Site UX at Scale — Feature 5)
- {% ref "WORK-044" /%} (collapsible groups — `o` key integration)
- {% ref "WORK-045" /%} (search bar — `/` key integration)
- {% ref "WORK-050" /%} (renderer convergence — enables `behaviors` array registration)

{% /work %}
