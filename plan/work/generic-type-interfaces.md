{% work id="WORK-120" status="done" priority="medium" complexity="moderate" tags="types, runes, architecture" milestone="v1.0.0" source="ADR-008" %}

# Export generic type interfaces for rune component overrides

> Ref: ADR-008 (Framework-native component interface for rune overrides — Approach B)

Depends on: WORK-117 (extraction logic), WORK-118 (uniqueness validation)

## Summary

Export generic TypeScript interfaces from rune packages that describe the component override contract — scalar property types derived from schema attributes and renderable slot names parameterized over a generic type. Component authors use these as `RecipeProps<Snippet>` (Svelte), `RecipeProps<ReactNode>` (React), etc.

## Acceptance Criteria

- [x] Core runes with component renderables export generic prop interfaces from `@refrakt-md/runes`
- [x] Community package runes with component renderables export generic prop interfaces from their respective packages (e.g., `RecipeProps` from `@refrakt-md/learning`)
- [x] Property types match schema attribute types (String → `string`, Number → `string` since meta content is always string, enum matches → union literal)
- [x] Slot names (from top-level refs) typed as `R | undefined` where `R` is the generic renderable type parameter
- [x] `children` and `tag` included in every interface (`children` as `R | undefined`, `tag` as `SerializedTag`)
- [x] Interfaces default the generic parameter to `unknown` (`Props<R = unknown>`)
- [x] Example usage documented in at least one community package README or doc page
- [x] Exported types build cleanly with no circular dependencies

## Approach

1. For each rune that uses `createComponentRenderable`, create a corresponding `Props<R>` interface
2. Property types derived from the schema's `attributes` definition
3. Slot names derived from the `refs` keys in `createComponentRenderable`
4. Export from the package's public API alongside the schema


## Resolution

Completed: 2026-04-04

Branch: `claude/adr-008-implementation-nBN9K`

### What was done
- Created `packages/types/src/component-props.ts` with BaseComponentProps<R>, PageSectionSlots<R>, SplitLayoutProperties
- Created `packages/runes/src/props.ts` with 37+ core rune interfaces
- Created props.ts for all 8 community packages (learning, marketing, docs, design, places, media, business, storytelling)
- Exported types from each package's index.ts
- Full build passes with no type errors or circular dependencies

### Notes
- Used Approach B from ADR-008 (generic interface with renderable type parameter)
- Common base types reduce duplication across interfaces
- Example usage documented in themes/components.md
