{% work id="WORK-541" status="done" priority="medium" complexity="simple" source="SPEC-126" milestone="v0.33.0" tags="types,refactor,dx" %}

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
- [x] The six configuration types live in `packages/types/src/config.ts`
- [x] `theme.ts` keeps `SiteThemeConfig`, `ThemeManifest`, `LayoutDefinition`, `ComponentDefinition`, and `getThemePackage`
- [x] `packages/types/src/types.ts` is deleted
- [x] `index.ts` re-exports them under two groups that name what they are
- [x] `config-schema.test.ts` reads the new path
- [x] The `codegroup` test fixtures referencing `types/src/theme.ts` still resolve
- [x] No consumer outside `@refrakt-md/types` changes

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

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`packages/types/src/config.ts`** (new) — `RefraktConfig`, `SiteConfig`,
`PlanConfig`, `XrefPattern`, `EntityRoute` and `RouteRule`, with a header
explaining why they are not in `theme.ts` and why `SiteThemeConfig` stayed
behind.

**`packages/types/src/theme.ts`** — down to the theme system:
`SiteThemeConfig`, `ThemeManifest`, `LayoutDefinition`, `ComponentDefinition`,
`getThemePackage`. 365 lines → 109.

**`packages/types/src/index.ts`** — two named groups (`Project configuration`
and `Theme system types`) in place of one `// Theme system types` comment over
the whole batch.

**`packages/types/src/types.ts`** deleted — zero lines, unreferenced since
`c3fe915`.

**`packages/transform/test/config-schema.test.ts`** — reads `config.ts`, with
both the path and the not-found message updated.

### Notes

- Two references the work item did not anticipate turned up at build time, both
  inside the package so the "no consumer outside `@refrakt-md/types` changes"
  criterion still holds: `distribution.ts` deep-imported `SiteConfig` from
  `./theme.js`, and `ThemeManifest.routeRules` references `RouteRule`. The
  latter makes `theme.ts` and `config.ts` mutually importing, which is fine —
  both are `import type`, erased at compile time.
- Verified the drift guard still guards rather than silently reading a file it
  cannot parse: added a probe field to `SiteConfig`, watched
  `describes every SiteConfig field` fail naming it, removed it, watched all 18
  pass. A path change to a test that reads source by string search is exactly
  the kind that can pass by finding nothing.
- Full suite 4263 passing, full build clean.

{% /work %}
