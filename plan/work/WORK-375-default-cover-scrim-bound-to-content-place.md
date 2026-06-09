{% work id="WORK-375" status="ready" priority="low" complexity="simple" source="SPEC-089" tags="surfaces, runes, lumina, layout" milestone="v0.20.0" %}

# Default cover scrim bound to content-place

Turn on a default scrim in cover mode targeting the media surface, with direction following `content-place`.

## Acceptance Criteria
- [ ] A default scrim is applied in `cover` mode (consuming the SPEC-088 scrim facet), targeting the media surface (SPEC-087 routing); `scrim="none"` disables.
- [ ] Scrim direction follows `content-place` by default and is independently overridable; the scrim region tracks the content area.
- [ ] The cover overlay's foreground colour follows `scrim-tone` (a scoped tint of the cover region — light text on a darkened light card by default; scoped to the band in `header` scope); an explicit `tint` overrides for a bespoke overlay colour.

## Approach
Depends on the SPEC-088 scrim facet (WORK-371). SPEC-089 §3.

## References

- {% ref "SPEC-089" /%}

{% /work %}
