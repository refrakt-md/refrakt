{% work id="WORK-080" status="done" priority="high" complexity="moderate" tags="storytelling, runes, transform" source="SPEC-028" %}

# Refactor Realm and Faction Transforms to Use Shared Utilities

> Ref: SPEC-028 (Rune Output Standards — Standards 2, 3, 4)

Depends on: WORK-076 (shared layout meta utility), WORK-077 (shared media unwrap utility)

## Summary

Realm and Faction share ~90% identical transform code (scene image extraction, description rendering, layout meta tags, content building, `createComponentRenderable` structure). Refactor both to use the shared utilities from WORK-076 and WORK-077, align their section structure to the standard 3-section pattern, and fix Faction's missing `mediaSlots` config.

## Acceptance Criteria

- [ ] Realm transform uses shared `buildLayoutMetas()` from WORK-076
- [ ] Faction transform uses shared `buildLayoutMetas()` from WORK-076
- [ ] Both transforms use shared `extractMediaImage()` from WORK-077 (replacing ~15-line inline unwrap loops)
- [ ] Shared storytelling helpers extracted for any remaining duplicated patterns between Realm and Faction
- [ ] Faction config declares `mediaSlots: { scene: 'cover' }` and corresponding `sections` entry for `scene: 'media'`
- [ ] Both runes follow standard 3-section structure (meta, content with preamble, media)
- [ ] Realm config sections aligned to standard pattern (preamble inside content)
- [ ] All existing tests pass (update snapshots if structure changes)

## Approach

1. Apply shared utilities from WORK-076 and WORK-077 to both transforms
2. Extract any remaining duplicated storytelling-specific logic into package helpers
3. Fix Faction's missing `mediaSlots` and `sections` config
4. Align section structure to standard pattern
5. Update test snapshots

## References

- {% ref "SPEC-028" /%} (Standard 2 — Preamble Groups with Content)
- {% ref "SPEC-028" /%} (Standard 3 — Config Must Match Schema Capabilities)
- {% ref "SPEC-028" /%} (Standard 4 — Avoid Duplicated Transform Logic)
- {% ref "WORK-076" /%} (shared layout meta utility)
- {% ref "WORK-077" /%} (shared media unwrap utility)

{% /work %}
