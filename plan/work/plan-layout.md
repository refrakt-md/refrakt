{% work id="WORK-037" status="ready" priority="high" complexity="simple" tags="transform, plan, layout" %}

# Define `planLayout` in `@refrakt-md/transform`

Add a `planLayout` alongside the existing `docsLayout` and `blogArticleLayout` in the transform package's layout configs.

The plan layout is structurally simple: a fixed sidebar slot for navigation and a main content area. No TOC, no breadcrumbs, no version switcher — just the two slots.

## Acceptance Criteria

- [ ] `planLayout` is exported from `packages/transform/src/layouts.ts`
- [ ] Layout has `sidebar` slot (source: `region:nav`) and `main` slot (source: `content`)
- [ ] Layout block name is `plan`
- [ ] Layout is importable as `import { planLayout } from '@refrakt-md/transform'`
- [ ] Existing layout tests still pass

## Approach

Follow the pattern of `docsLayout` and `blogArticleLayout` in `packages/transform/src/layouts.ts`. The plan layout is simpler than either — no computed content slots, no behaviors.

## References

- SPEC-014 (Plan Site via HTML Adapter)

{% /work %}
