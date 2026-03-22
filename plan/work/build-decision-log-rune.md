{% work id="WORK-023" status="pending" priority="low" complexity="moderate" tags="runes, plan, pipeline" %}

# Build `decision-log` Rune

> Ref: SPEC-021 (Plan Runes) — Package: `@refrakt-md/plan`

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

- [ ] Rune schema in `runes/plan/src/tags/decision-log.ts` with filter/sort attributes
- [ ] `aggregate()` pipeline hook queries entity registry for decision entities
- [ ] Results sorted by date (reverse chronological by default) or id
- [ ] Filter parsing reuses backlog filter syntax
- [ ] Renders as a list with date, status badge, id, and title per entry
- [ ] Engine config in `runes/plan/src/config.ts`
- [ ] CSS in `packages/lumina/styles/runes/decision-log.css`
- [ ] Tests for filtering, sorting, and rendering
- [ ] Exported from `runes/plan/src/index.ts`

## Dependencies

- WORK-020 (entity registration) must be complete first
- Filter parsing can be shared with backlog rune (WORK-022)

{% /work %}
