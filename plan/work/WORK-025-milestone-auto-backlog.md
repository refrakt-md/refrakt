{% work id="WORK-025" status="done" priority="low" complexity="moderate" tags="runes, plan, pipeline" source="SPEC-021" %}

# Milestone Auto-Backlog and Checklist Progress

> Ref: {% ref "SPEC-021" /%} (Plan Runes) — Package: `@refrakt-md/plan`

## Summary

Two related rendering enhancements for the plan package:

1. **Milestone auto-backlog**: The milestone rune automatically appends a filtered view of all work items and bugs assigned to its `name`, grouped by status. This makes milestones self-updating — as work items are created with `milestone="v0.5.0"`, they appear in the v0.5.0 milestone page automatically.

2. **Checklist progress**: Work items with `- [ ]` / `- [x]` checkbox lists show a progress indicator in their header (e.g., `2/5` or a progress bar). The milestone view shows aggregate progress across all assigned items.

## Acceptance Criteria

- [x] Milestone `postProcess` hook queries entity registry for work/bug entities with matching `milestone` field
- [x] Queried items rendered as summary cards below the milestone's own content
- [x] Items grouped by status (done, in-progress, ready, etc.)
- [x] Work items with checkbox lists show checked/total count in header
- [x] Milestone shows aggregate progress (total checked / total checkboxes across all items)
- [x] CSS for progress indicator (bar or fraction display)
- [x] Tests for milestone query, progress counting, and rendering

## Approach

Checklist progress likely uses a `postTransform` hook on the work rune config that walks the renderable tree counting checkbox list items. The count is injected as a data attribute or structural element.

Milestone auto-backlog uses a `postProcess` pipeline hook that queries the entity registry and appends backlog card markup to the milestone's renderable tree.

## Dependencies

- {% ref "WORK-020" /%} (entity registration) — entities must be registered first
- {% ref "WORK-022" /%} (backlog rune) — card layout rendering can be shared

{% /work %}
