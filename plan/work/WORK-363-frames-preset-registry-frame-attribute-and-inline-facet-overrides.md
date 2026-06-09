{% work id="WORK-363" status="ready" priority="high" complexity="complex" source="SPEC-086" tags="chrome, runes, engine, lumina" milestone="v0.20.0" %}

# frames preset registry + frame attribute and inline facet overrides

Add a `frames` preset registry parallel to `backgrounds`, the `frame` attribute with inline facet overrides, and complete the `offset` named scale.

## Acceptance Criteria
- [ ] A `frames` registry exists in theme config, structurally parallel to `backgrounds`, with `extends` resolution shared with `bg`/`tint`.
- [ ] `frame="preset"` applies a named preset; inline `frame-aspect|displace|offset|oversize|place|anchor|shadow` override facets and work without a preset.
- [ ] `offset` is a named scale (`none|sm|md|lg|xl`) backed by `--rf-spacing-*`; the `resolveOffset` raw-length fallthrough is closed (unknown values warn).
- [ ] The frame shadow facet renders as `drop-shadow` (silhouette), never colliding with `elevation`'s `box-shadow`.

## Approach
Reuse the `bg` pipeline: `engine.ts` bg resolution, `BgPresetDefinition`, `merge.ts` `extends`. SPEC-086 §2.

## References

- {% ref "SPEC-086" /%}

{% /work %}
