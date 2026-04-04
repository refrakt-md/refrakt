{% work id="WORK-120" status="ready" priority="medium" complexity="moderate" tags="types, runes, architecture" milestone="v1.0.0" %}

# Export generic type interfaces for rune component overrides

> Ref: ADR-008 (Framework-native component interface for rune overrides — Approach B)

Depends on: WORK-117 (extraction logic), WORK-118 (uniqueness validation)

## Summary

Export generic TypeScript interfaces from rune packages that describe the component override contract — scalar property types derived from schema attributes and renderable slot names parameterized over a generic type. Component authors use these as `RecipeProps<Snippet>` (Svelte), `RecipeProps<ReactNode>` (React), etc.

## Acceptance Criteria

- [ ] Core runes with component renderables export generic prop interfaces from `@refrakt-md/runes`
- [ ] Community package runes with component renderables export generic prop interfaces from their respective packages (e.g., `RecipeProps` from `@refrakt-md/learning`)
- [ ] Property types match schema attribute types (String → `string`, Number → `string` since meta content is always string, enum matches → union literal)
- [ ] Slot names (from top-level refs) typed as `R | undefined` where `R` is the generic renderable type parameter
- [ ] `children` and `tag` included in every interface (`children` as `R | undefined`, `tag` as `SerializedTag`)
- [ ] Interfaces default the generic parameter to `unknown` (`Props<R = unknown>`)
- [ ] Example usage documented in at least one community package README or doc page
- [ ] Exported types build cleanly with no circular dependencies

## Approach

1. For each rune that uses `createComponentRenderable`, create a corresponding `Props<R>` interface
2. Property types derived from the schema's `attributes` definition
3. Slot names derived from the `refs` keys in `createComponentRenderable`
4. Export from the package's public API alongside the schema
