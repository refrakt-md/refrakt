{% work id="WORK-076" status="done" priority="high" complexity="simple" tags="runes, transform, architecture" %}

# Extract Shared Layout Meta Tag Utility

> Ref: SPEC-028 (Rune Output Standards — Standard 6)

## Summary

Runes that extend `SplitLayoutModel` all emit identical boilerplate for layout meta tags (layout, ratio, valign, gap, collapse). Extract this into a shared utility in `@refrakt-md/runes` so each rune's transform calls one function instead of copy-pasting the conditional logic.

## Acceptance Criteria

- [ ] New `buildLayoutMetas()` utility exported from `packages/runes/src/common.ts` (or a new `layout-helpers.ts`)
- [ ] Utility accepts the split layout attrs object and returns `{ metas: Tag[], properties: Record<string, Tag> }`
- [ ] Handles the `layout !== 'stacked'` guard, gap/collapse conditionals, and all five meta tags (layout, ratio, valign, gap, collapse)
- [ ] `recipe.ts` in `@refrakt-md/learning` refactored to use the shared utility
- [ ] `realm.ts` and `faction.ts` in `@refrakt-md/storytelling` refactored to use the shared utility
- [ ] `playlist.ts` in `@refrakt-md/media` refactored to use the shared utility
- [ ] All existing tests pass — no change to identity transform output

## Approach

1. Study the layout meta tag block in `recipe.ts` (reference implementation) and compare with `realm.ts`, `faction.ts`, `playlist.ts`
2. Extract the shared pattern into a utility function
3. Replace the inline blocks in all four runes with calls to the utility
4. Run tests to verify output is unchanged

## References

- SPEC-028 (Standard 6 — Layout Meta Tag Emission Should Be Shared)

{% /work %}
