{% work id="WORK-023" status="done" priority="low" complexity="moderate" tags="runes, plan, pipeline" source="SPEC-021" %}

# Build `decision-log` Rune

> Ref: {% ref "SPEC-021" /%} (Plan Runes) — Package: `@refrakt-md/plan`

## Summary

Aggregation rune that renders a chronological view of all architecture decision records. Queries the entity registry for `decision` entities and displays them as a sortable, filterable list with date, status, and title.

Simpler than the backlog rune — no grouping, no card layout. Just a clean chronological list.

## Attributes

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `filter` | String | — | Filter by status or tags (same `field:value` syntax as backlog) |
| `sort` | String | `date` | Sort order: `date` (reverse chronological) or `id` |

## Example

```markdoc
{% decision-log sort="date" /%}
{% decision-log filter="status:accepted" sort="date" /%}
```

## Acceptance Criteria

- [x] Rune schema in `runes/plan/src/tags/decision-log.ts` with filter/sort attributes
- [x] `aggregate()` pipeline hook queries entity registry for decision entities
- [x] Results sorted by date (reverse chronological by default) or id
- [x] Filter parsing reuses backlog filter syntax
- [x] Renders as a list with date, status badge, id, and title per entry
- [x] Engine config in `runes/plan/src/config.ts`
- [x] CSS in `packages/lumina/styles/runes/decision-log.css`
- [x] Tests for filtering, sorting, and rendering
- [x] Exported from `runes/plan/src/index.ts`

## Dependencies

- {% ref "WORK-020" /%} (entity registration) must be complete first
- Filter parsing can be shared with backlog rune ({% ref "WORK-022" /%})

{% /work %}
