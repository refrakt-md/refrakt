{% work id="WORK-020" status="done" priority="medium" tags="packages, plan, xref" %}

# Add Entity Registration to `@refrakt-md/plan`

> Ref: {% ref "SPEC-002" /%} (Cross-Page Pipeline)

## Summary

The `@refrakt-md/plan` package defines five rune types (spec, work, bug, decision, milestone), each with an `id` attribute — but the package has no `pipelineHooks`. This means plan entities are invisible to the xref resolution pipeline.

Add a `register()` hook to the plan package that scans transformed pages for plan runes and registers them in the `EntityRegistry`. Once registered, any page can use `{% xref "SPEC-008" /%}` or `{% xref "WORK-015" /%}` to link to plan documents.

## Acceptance Criteria

- [x] Plan package exports `pipelineHooks` with a `register()` hook
- [x] The hook registers entities for all five rune types: `spec`, `work`, `bug`, `decision`, `milestone`
- [x] Each entity includes: `id`, `title` (from heading), `url` (page URL), `status`, and type-specific fields
- [ ] `{% xref "SPEC-008" /%}` resolves to a link when plan content is in the pipeline
- [ ] `{% xref "WORK-015" /%}` resolves with type `work`
- [ ] Type hints work: `{% xref "ADR-001" type="decision" /%}` narrows the search
- [x] Tests cover registration and resolution of all five entity types

## Approach

Follow the pattern in `corePipelineHooks.register` (`packages/runes/src/config.ts`). Walk each page's renderable tree, find nodes with `typeof` matching plan schema types (`Spec`, `Work`, `Bug`, `Decision`, `Milestone`), extract the `id` property meta tag, and call `registry.register()` with the appropriate entity type and data fields.

{% /work %}
