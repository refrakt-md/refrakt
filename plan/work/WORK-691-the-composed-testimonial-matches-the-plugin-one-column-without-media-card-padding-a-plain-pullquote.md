{% work id="WORK-691" status="done" priority="medium" complexity="simple" source="SPEC-161,SPEC-181" tags="runes, composition, testimonial, pullquote, split, staging" milestone="v0.45.0" pr="refrakt-md/refrakt#746,refrakt-md/refrakt#747" %}

# The composed testimonial matches the plugin: one column without media, card padding, a plain pullquote

Reviewing the staged `testimonial` on staging.refrakt.md (SPEC-181) found four differences from the
plugin:

- On desktop the quote sat in half the card. A testimonial with no avatar emits no media zone, but
  `media-position="start"` still laid the section out in two columns.
- The card was padded 0.5rem, not the plugin's 1.75rem by 2rem. The composition defaulted
  `density: compact`, which pads a surface at `spacing-sm`.
- The byline's name was set at body size (16px) by the `lead` layout; the plugin's is 14px.
- The quote was drawn as a prose blockquote (accent rule, quote glyph, indent, muted). The plugin
  draws it as the card's content: italic, body size, full colour.

## Acceptance Criteria
- [x] A `start` or `end` split with no media zone lays out as one column, on every split rune
- [x] The staged testimonial no longer defaults `density: compact`, so the card takes the default surface padding
- [x] `pullquote` gains `variant="plain"`: italic, body size, no rule, glyph or indent, never floated, whatever its `align` *(withdrawn before release: SPEC-185 D2)*
- [x] The staged testimonial places its quote in `{% pullquote variant="plain" %}`, and still publishes `reviewBody` *(withdrawn before release: SPEC-185 D2)*
- [x] The pullquote reference page shows the plain variant, and the generated attributes and contracts are regenerated *(withdrawn before release: SPEC-185 D2)*
- [x] A `lead` block is set small throughout, so the byline's name is the plugin's 14px
- [x] `pullquote` unwraps an authored blockquote rather than nesting it, carrying its attributes, so the testimonial's quote is one `<blockquote>` with `reviewBody` on it
- [x] The testimonial comparison tests assert the new structure, and staging.refrakt.md is reviewed against refrakt.md

## References

- {% ref "SPEC-161" /%}: D1, the composed testimonial.
- {% ref "SPEC-181" /%}: the staging review.

## Resolution

Completed: 2026-11-01

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `skeleton/styles/layouts/split.css`: a `start`/`end` split with no media zone lays out as one column, on every split rune.
- `site/staged-runes/testimonial.md`: `density: compact` dropped, so the card takes the default surface padding.
- `lumina/styles/dimensions/metadata.css`: a `lead` block is set small throughout, so the byline's name is 14px.
- `runes/src/tags/pullquote.ts`: pullquote unwraps an authored blockquote rather than nesting it, carrying its attributes. `runes/test/pullquote.test.ts` is new.
- Phone and desktop screenshots of staging match the plugin card, apart from the quote's styling (below).

### Notes
- `pullquote variant="plain"` was added (#746) and then withdrawn before release (#747). The staging review led to SPEC-185, under which decoration belongs to the theme and a testimonial's quote is a featured quotation styled by role, not by a look-name.
- Until SPEC-185 lands, the staged testimonial places its quote slot directly and shows Lumina's prose blockquote. The testimonial's quote look is SPEC-185's work, not this item's.

{% /work %}
