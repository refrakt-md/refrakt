{% work id="WORK-368" status="done" priority="medium" complexity="moderate" source="SPEC-087" tags="surfaces, runes, engine, docs" milestone="v0.20.0" %}

# substrateTarget routing + build validation + surfaces theme-authoring docs

Add `substrateTarget` routing (default self, theme-overridable, author wins), media-well binding and validation, and document the three fill layers.

## Acceptance Criteria
- [x] Surface fill target is `RuneConfig.substrateTarget` (default `'self'`, separate from `frameTarget`), theme-overridable via `mergeThemeConfig`; a per-instance `substrate-target="self|media"` always wins.
- [x] Targeting `media` on a rune with no media section emits a build warning; the addressable media-well surface is defined for later `tint` reuse.
- [x] A theme-authoring "surfaces" page documents the three fill layers (`tint`=colour, `bg`=image, `substrate`=pattern), the self/media-well targeting, and the Case A/B examples.

## Approach
Media-zone element WORK-339; `mergeThemeConfig`. SPEC-087 §2.

## References

- {% ref "SPEC-087" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-087-surface-fills`

### What was done
- `RuneConfig.substrateTarget` (default `'self'`, separate from `frameTarget`), theme-overridable via `mergeThemeConfig`; per-instance `substrate-target="self|media"` always wins; media-zone binding to `[data-section="media"]`; build warning + `validate.ts` validation when targeting media on a rune with no media section.
- Theme-authoring `surface-fills.md` page: the three fill layers (tint/bg/substrate), the substrate enum + facets, the tint-tracking inset surface, self/media-well targeting, and the Case A/B examples.

### Notes
- The addressable media-well surface is defined here for later `tint` reuse (a follow-on).

{% /work %}
