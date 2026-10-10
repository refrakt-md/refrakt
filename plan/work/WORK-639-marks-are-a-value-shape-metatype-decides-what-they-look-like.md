{% work id="WORK-639" status="ready" priority="medium" complexity="simple" source="SPEC-161" tags="engine, metadata, theme, accessibility, plan, marketing" %}

# Marks are a value shape; metaType decides what they look like

A `metaFields` entry can render its value as marks: `rating: { total }` makes the engine emit
`total` spans, the first `value` of them `data-filled="true"` (`buildRatingValue`,
`packages/transform/src/engine.ts`). The mechanism is generic (its own doc comment says "star
ratings, progress dots, etc."), but the output is not:

- **It fuses shape and meaning.** It always stamps `data-meta-type="rating"` and ignores the
  field's own `metaType`, which every other shape (the icon shape, chips, plain values) carries
  through. So a theme can only draw one glyph for every use, and any second use would render as
  stars.
- **It has one consumer.** Only `testimonial` uses it (`plugins/marketing/src/config.ts`).
- **The second use is hand-rolled instead.** `work`'s complexity is declared
  `metaType: 'quantity'` and is drawn as dots by five CSS rules, one per value,
  `[data-complexity="moderate"] … dd::after { content: "  ●●●" }`
  (`packages/lumina/styles/runes/work.css`).
- **It has no text alternative.** The marks are empty spans, so a screen reader announces
  nothing.

The fix separates the two: `marks` is the shape (how many, how many filled), and the existing
`metaType` vocabulary is the meaning, which the theme keys the glyph on. No new intent axis is
needed; `metaType` already is "what kind of value this is".

## Acceptance Criteria

- [ ] The field shape is `marks: { total, values? }`; `rating: { total }` keeps working as an alias for one release, with a deprecation note
- [ ] The marks element carries the field's `metaType` as `data-meta-type`, like the other shapes; a field with no `metaType` gets none
- [ ] `values` maps an enum to a filled count (`{ trivial: 1, simple: 2, moderate: 3, complex: 4 }`); a value with no entry renders as plain text
- [ ] The marks carry a text alternative (for example `role="img"` and `aria-label="3 of 4"`, localisable), asserted in a test
- [ ] `metaType` gains `rating`; `testimonial` declares `metaType: 'rating'` and renders exactly as today
- [ ] Lumina draws stars for `[data-meta-type="rating"]` marks and neutral dots for every other marks element
- [ ] `work` renders complexity through `marks`, and the five `[data-complexity]` `::after` rules in `work.css` are deleted
- [ ] Contracts are regenerated on both copies and the diff reviewed; the SEO baseline does not move (`rating` still publishes `ratingValue`)

## Approach

`buildRatingValue` becomes `buildMarksValue`, reads `f.field.marks ?? f.field.rating`, resolves
the filled count through `values` when present, and copies `f.field.metaType` onto the element
as `buildIconValue` does. `ResolvedField.ratingTotal` follows the rename. The `metaType` unions in
`packages/transform/src/types.ts` gain `'rating'`.

A composed rune declares marks through `metaFields` in frontmatter, as testimonial's does in
SPEC-161 D1, so the composition path needs nothing beyond the rename.

## References

- {% ref "SPEC-161" /%} D1: the composed `testimonial`, which measured the rating shape publishing through a composition.

{% /work %}
