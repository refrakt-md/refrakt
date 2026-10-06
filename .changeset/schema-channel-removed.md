---
'@refrakt-md/runes': minor
---

**Breaking:** remove the imperative schema.org channel from `createComponentRenderable` (WORK-599)

`TransformResult.schema`, `TransformResult.typeof` and
`InlineTransformResult.schemaOrgType` are gone, along with the unused
`schemaOrgType` fields on `AccordionProps` and `AccordionItemProps`.

SPEC-130 moved every rune to the declarative table on
`createContentModelSchema({ schema })`. The imperative fields kept type-checking
but were no longer what the appliers and the structured-data pipeline are built
around, and no rune in this repository passed them. A surface that still
compiles but no longer does what its docs say is worse than none.

**Migrating a third-party plugin:** move the type and property mappings into a
schema table on the rune's `createContentModelSchema` call. See "Declaring
schema.org output" in the plugin authoring guide.

Rendered output is unchanged for every built-in rune.
