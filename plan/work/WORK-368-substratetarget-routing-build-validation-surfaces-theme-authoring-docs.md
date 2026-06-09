{% work id="WORK-368" status="ready" priority="medium" complexity="moderate" source="SPEC-087" tags="surfaces, runes, engine, docs" milestone="v0.20.0" %}

# substrateTarget routing + build validation + surfaces theme-authoring docs

Add `substrateTarget` routing (default self, theme-overridable, author wins), media-well binding and validation, and document the three fill layers.

## Acceptance Criteria
- [ ] Surface fill target is `RuneConfig.substrateTarget` (default `'self'`, separate from `frameTarget`), theme-overridable via `mergeThemeConfig`; a per-instance `substrate-target="self|media"` always wins.
- [ ] Targeting `media` on a rune with no media section emits a build warning; the addressable media-well surface is defined for later `tint` reuse.
- [ ] A theme-authoring "surfaces" page documents the three fill layers (`tint`=colour, `bg`=image, `substrate`=pattern), the self/media-well targeting, and the Case A/B examples.

## Approach
Media-zone element WORK-339; `mergeThemeConfig`. SPEC-087 §2.

## References

- {% ref "SPEC-087" /%}

{% /work %}
