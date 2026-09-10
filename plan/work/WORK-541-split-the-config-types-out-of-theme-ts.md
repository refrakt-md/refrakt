{% work id="WORK-541" status="ready" priority="medium" complexity="simple" source="SPEC-126" milestone="v0.33.0" tags="types,refactor,dx" %}

# Split the config types out of theme.ts

`RefraktConfig`, `SiteConfig`, `PlanConfig`, `XrefPattern`, `EntityRoute`, and
`RouteRule` live in `packages/types/src/theme.ts`, which is not about themes.
Move them to `config.ts`, leave the theme-system types behind, and stop
`index.ts` re-exporting the whole batch under one `// Theme system types`
comment.

The file was created by `c3fe915` (v0.25.0), a mechanical split of one types
module into fifteen files. The same commit left `packages/types/src/types.ts` as
a zero-line file that is still empty and still unreferenced.

This matters because {% ref "SPEC-126" /%} claims the docs are generated from the
schema and the schema is drift-tested against the types. A reader following that
chain should not land in a file whose name says it is about something else.

## Acceptance Criteria
- [ ] The six configuration types live in `packages/types/src/config.ts`
- [ ] `theme.ts` keeps `SiteThemeConfig`, `ThemeManifest`, `LayoutDefinition`, `ComponentDefinition`, and `getThemePackage`
- [ ] `packages/types/src/types.ts` is deleted
- [ ] `index.ts` re-exports them under two groups that name what they are
- [ ] `config-schema.test.ts` reads the new path
- [ ] The `codegroup` test fixtures referencing `types/src/theme.ts` still resolve
- [ ] No consumer outside `@refrakt-md/types` changes

## Approach

Type-only move, no runtime change. Nothing outside the package deep-imports
`theme.ts` — every consumer goes through the package index, so the re-exports
keep them working untouched. The only in-repo references to the path are
`config-schema.test.ts`, which reads the source to extract interface members,
and some `codegroup` test fixtures that cite it as an example file.

Do this first. It is independent of everything else in the milestone and worth
landing on its own merits even if the rest slips.

Leave `SiteThemeConfig` in `theme.ts` — it is genuinely a theme type that
`SiteConfig` references, and the reference direction is the reason everything
ended up filed under it in the first place.

{% /work %}
