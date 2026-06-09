{% work id="WORK-376" status="ready" priority="low" complexity="simple" source="SPEC-089" tags="surfaces, runes, lumina, docs" milestone="v0.20.0" %}

# Card intrinsic height/aspect knob for bg-only cards + card docs

Add a card intrinsic height/aspect knob for bg-only cards and document cover mode in the card reference.

## Acceptance Criteria
- [ ] A card intrinsic-height knob (named-scale `height` + `aspect`) preserves height for `bg`-only cards (out-of-flow `bg`), documented as the standalone analog of bento row-spans.
- [ ] The `card` reference documents `cover` mode, `content-place`, the cover scrim default, and card height, cross-linked with SPEC-087/088/086.

## Approach
SPEC-089 §4 + Docs.

## References

- {% ref "SPEC-089" /%}

{% /work %}
