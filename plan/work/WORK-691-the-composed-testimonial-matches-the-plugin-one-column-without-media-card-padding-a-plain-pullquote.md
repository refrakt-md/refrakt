{% work id="WORK-691" status="in-progress" priority="medium" complexity="simple" source="SPEC-161,SPEC-181" tags="runes, composition, testimonial, pullquote, split, staging" milestone="v0.45.0" %}

# The composed testimonial matches the plugin: one column without media, card padding, a plain pullquote

Reviewing the staged `testimonial` on staging.refrakt.md (SPEC-181) found three differences from the
plugin:

- On desktop the quote sat in half the card. A testimonial with no avatar emits no media zone, but
  `media-position="start"` still laid the section out in two columns.
- The card was padded 0.5rem, not the plugin's 1.75rem by 2rem. The composition defaulted
  `density: compact`, which pads a surface at `spacing-sm`.
- The quote was drawn as a prose blockquote (accent rule, quote glyph, indent, muted). The plugin
  draws it as the card's content: italic, body size, full colour.

## Acceptance Criteria
- [x] A `start` or `end` split with no media zone lays out as one column, on every split rune
- [x] The staged testimonial no longer defaults `density: compact`, so the card takes the default surface padding
- [x] `pullquote` gains `variant="plain"`: italic, body size, no rule, glyph or indent, never floated, whatever its `align`
- [x] The staged testimonial places its quote in `{% pullquote variant="plain" %}`, and still publishes `reviewBody`
- [x] The pullquote reference page shows the plain variant, and the generated attributes and contracts are regenerated
- [ ] The testimonial comparison tests assert the new structure, and staging.refrakt.md is reviewed against refrakt.md

## References

- {% ref "SPEC-161" /%}: D1, the composed testimonial.
- {% ref "SPEC-181" /%}: the staging review.

{% /work %}
