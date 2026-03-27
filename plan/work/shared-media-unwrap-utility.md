{% work id="WORK-077" status="done" priority="high" complexity="simple" tags="runes, transform, architecture" %}

# Extract Shared Media Image Unwrap Utility

> Ref: SPEC-028 (Rune Output Standards — Standards 3a, 4)

## Summary

Media zones must unwrap Markdoc's `<p><img/></p>` to emit a bare `<img>` inside the media container. This logic exists inline in `realm.ts` and `faction.ts` (~15 lines each) and is missing from `recipe.ts` and `playlist.ts`. Extract it into a single shared utility and apply it everywhere.

## Acceptance Criteria

- [ ] New `extractMediaImage()` utility (or similar) exported from `packages/runes/src/common.ts`
- [ ] Utility uses `RenderableNodeCursor`'s `.tag('img')` traversal to unwrap paragraph-wrapped images
- [ ] `recipe.ts` media zone updated to use the utility — `<p><img/></p>` no longer survives into output
- [ ] `playlist.ts` media zone updated to use the utility
- [ ] `realm.ts` and `faction.ts` inline unwrap code replaced with calls to the shared utility
- [ ] Identity transform output for recipe and playlist now emits `<div data-name="media"><img .../></div>` (no `<p>` wrapper)
- [ ] All existing tests pass (update snapshots if media zone output changes)

## Approach

1. Study the inline unwrap code in `realm.ts`/`faction.ts` and the `cursor.tag('img').limit(1)` pattern from `pageSectionProperties`
2. Create a utility that takes transformed media nodes and returns an unwrapped img in a container div
3. Apply to all four runes with media zones
4. Update any test snapshots that captured the old `<p><img/></p>` structure

## References

- SPEC-028 (Standard 3a — Media Zones Must Unwrap Paragraph-Wrapped Images)
- SPEC-028 (Standard 4 — Avoid Duplicated Transform Logic)

{% /work %}
