{% work id="WORK-100" status="done" priority="high" complexity="simple" tags="runes, content-model" milestone="v1.0.0" %}

# Migrate simple community runes from Model to createContentModelSchema

Migrate community package runes that use straightforward `@group` decorator patterns. These map directly to `sequence` or `sections` content models with no custom `processChildren` logic.

## Runes

| Rune | Package | File | Content model |
|------|---------|------|---------------|
| feature | marketing | `runes/marketing/src/tags/feature.ts` | sequence |
| steps | marketing | `runes/marketing/src/tags/steps.ts` | sequence |
| character | storytelling | `runes/storytelling/src/tags/character.ts` | sections |
| faction | storytelling | `runes/storytelling/src/tags/faction.ts` | sections |
| plot | storytelling | `runes/storytelling/src/tags/plot.ts` | sections |
| realm | storytelling | `runes/storytelling/src/tags/realm.ts` | sections |
| cast | business | `runes/business/src/tags/cast.ts` | sections |
| timeline | business | `runes/business/src/tags/timeline.ts` | sections |
| changelog | docs | `runes/docs/src/tags/changelog.ts` | sections |
| preview | design | `runes/design/src/tags/preview.ts` | sequence |

## Acceptance Criteria

- [x] All 10 runes rewritten using `createContentModelSchema`
- [x] `refrakt inspect <rune> --type=all` output is identical before and after for each rune
- [x] All existing tests pass after each migration
- [x] No Model class import remains in any of the migrated files
- [x] Community package builds succeed (`npm run build` for each affected package)

## Approach

Same per-rune process as WORK-099. Group by package to minimize context switching — do all marketing runes together, then storytelling, etc.

## Dependencies

- WORK-099 (builds confidence in the migration pattern on core runes first)

## References

- SPEC-032 (parent spec)

{% /work %}
