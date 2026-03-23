{% work id="WORK-022" status="pending" priority="medium" complexity="complex" tags="runes, plan, pipeline" %}

# Build `backlog` Rune

> Ref: {% ref "SPEC-021" /%} (Plan Runes) — Package: `@refrakt-md/plan`

## Summary

Aggregation rune that queries the entity registry and renders a filtered, sorted, grouped view of work items and bugs. This is the first Phase 2 rune in the plan package — it requires the cross-page pipeline and entity registration ({% ref "WORK-020" /%}) to function.

The backlog rune is also the rendering primitive used by the milestone auto-backlog feature ({% ref "WORK-025" /%}).

## Attributes

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `filter` | String | — | Filter expression: `field:value` pairs (e.g., `status:ready priority:high`) |
| `sort` | String | `priority` | Sort order: `priority`, `status`, `id`, `assignee`, `complexity`, `milestone` |
| `group` | String | — | Group items by: `status`, `priority`, `assignee`, `milestone`, `type`, `tags` |
| `show` | String | `all` | Entity types to include: `all`, `work`, `bug` |

## Filter Syntax

Space-separated `field:value` pairs. Multiple values for the same field act as OR. Different fields act as AND.

```markdoc
{% backlog filter="status:ready priority:high" /%}
{% backlog filter="milestone:v0.5.0" sort="priority" group="status" /%}
{% backlog filter="assignee:bjorn status:in-progress" /%}
{% backlog filter="tags:tint" show="work" /%}
```

## Card Layout

Each entity renders as a compact summary card showing id, status badge, priority badge, complexity dots, title, milestone, and checklist progress (if available).

## Acceptance Criteria

- [ ] Rune schema in `runes/plan/src/tags/backlog.ts` with filter/sort/group/show attributes
- [ ] Filter parser handles `field:value` syntax with AND/OR semantics
- [ ] `aggregate()` pipeline hook queries entity registry for work and bug entities
- [ ] Results sorted by specified field
- [ ] Results grouped into sections when `group` specified
- [ ] Summary card rendering with BEM classes (`rf-backlog`, `rf-backlog__card`, etc.)
- [ ] Engine config in `runes/plan/src/config.ts`
- [ ] CSS in `packages/lumina/styles/runes/backlog.css`
- [ ] Tests for filter parsing, sorting, grouping, and card rendering
- [ ] Type definition in `runes/plan/src/types.ts`
- [ ] Exported from `runes/plan/src/index.ts`

## Dependencies

- {% ref "WORK-020" /%} (entity registration) must be complete first
- Uses `PackagePipelineHooks.aggregate()` from `@refrakt-md/types`

{% /work %}
