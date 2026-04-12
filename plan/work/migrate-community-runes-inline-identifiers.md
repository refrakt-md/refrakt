{% work id="WORK-107" status="done" priority="high" complexity="simple" tags="runes, types, packages" milestone="v1.0.0" source="ADR-005" %}

# Migrate community package runes to inline rune identifiers

Phase 2b of ADR-005. Update all ~65 community package rune transforms across 8 packages to use the new inline `{ rune: 'name' }` signature for `createComponentRenderable`. Same mechanical change as WORK-106 but across community packages.

Depends on WORK-105 (dual-signature support) being complete.

## Packages

| Package | Directory | Approx. runes |
|---------|-----------|---------------|
| marketing | `runes/marketing/` | 9 (hero, cta, bento, feature, steps, pricing, testimonial, comparison, storyboard) |
| docs | `runes/docs/` | 3 (api, symbol, changelog) |
| design | `runes/design/` | 7 (swatch, palette, typography, spacing, preview, mockup, design-context) |
| learning | `runes/learning/` | 2 (howto, recipe) |
| storytelling | `runes/storytelling/` | 7 (character, realm, faction, lore, plot, bond, storyboard) |
| business | `runes/business/` | 3 (cast, organization, timeline) |
| places | `runes/places/` | 3 (event, map, itinerary) |
| media | `runes/media/` | 3 (music-playlist, music-recording, + track) |
| plan | `runes/plan/` | ~8 (spec, work, bug, decision, milestone, etc.) |

## Acceptance Criteria

- [x] Every `createComponentRenderable(schema.X, { ... })` call in `runes/*/src/tags/` is replaced with inline form
- [x] Runes with `schemaOrgType` pass it in the new inline object
- [x] No community package file imports from any `schema/` directory or registry for Type purposes
- [x] Each package's local registry/schema imports for Type creation are removed
- [x] `refrakt inspect <rune> --type=all --json` output is identical before and after for each rune
- [x] All existing tests pass

## Approach

Same mechanical approach as WORK-106. For each community package:
1. Identify all tag files that call `createComponentRenderable`
2. Replace `schema.X` argument with inline `{ rune: 'name' }` form
3. Remove schema/registry imports
4. Verify output is identical

Can be done one package at a time. Order doesn't matter.

## References

- {% ref "ADR-005" /%} (Phase 2)
- {% ref "WORK-105" /%} (dependency — dual-signature support)

{% /work %}
