{% work id="WORK-697" status="done" priority="medium" complexity="complex" source="SPEC-185" tags="pullquote, quotation, attribution, prominence, accessibility" milestone="v0.47.0" pr="refrakt-md/refrakt#762" %}

# Pullquote is the featured quotation, with its attribution

SPEC-185 D2, D4, D6 (the after form) and D9: `pullquote` renders a featured quotation as a `<figure>`, reads its attribution from the paragraph after the quote, takes `prominence`, gains the `quote` alias, and deprecates `variant`.

## Acceptance Criteria
- [x] `pullquote` renders `<figure data-quote="featured"><blockquote>…</blockquote>[<figcaption>…</figcaption>]</figure>`, never a nested blockquote (D4)
- [x] `excerpt` renders an `<aside aria-hidden="true" data-quote="excerpt">` holding the same structure (D4)
- [x] An attribution paragraph after the quote (`**Name** — Source`) is read as one group with it and rendered as `<figcaption>` with `<cite>` (D6)
- [x] `quote` is an alias of `pullquote` (D4)
- [x] The prominence facet applies to a featured quotation or an excerpt, and Lumina ramps the quote's size by step (D9)
- [x] `variant` warns as deprecated, `accent` maps to `tint` and `prominence="prominent"`, and `align` stays (D2)
- [x] The pullquote reference page describes roles, not looks, and shows the attribution and `excerpt`

## Blocked by

- {% ref "WORK-692" /%}
- {% ref "WORK-696" /%}

## References

- {% ref "SPEC-185" /%}: D2, D4, D6, D9.

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`
PR: refrakt-md/refrakt#762

### What was done
- `packages/runes/src/tags/pullquote.ts`: the root is a `<figure data-quote="featured">` (or `<aside aria-hidden="true" data-quote="excerpt">` holding the figure). It has a conditional content model: a blockquote plus an optional `**Name** — Source` attribution paragraph, else paragraphs as the quote. Also added `renderAttribution` (figcaption/cite), the `excerpt` attribute, and the `variant` deprecation mapping accent to tint="subtle" + prominence="prominent".
- `packages/transform/src/facets/prominence.ts`: `takesProminence` with the `featured-quotation` capability (`FEATURED_QUOTATION_CAPABILITY`), used by the facet and the contract.
- `packages/runes/src/config.ts` / `index.ts`: dropped the `variant` modifier, `provides: ['prose', 'featured-quotation']`, the `quote` alias, the new snippet.
- `packages/lumina/styles/elements/blockquote.css`: the featured/excerpt role styles, with the glyph shared as `--rf-glyph-quote` and sized to the quote. `runes/pullquote.css` is now placement only; skeleton trimmed to figure margins and floats.
- Tests, fixture, contracts, rune-attributes, snippet, reference and theme docs updated.

### Notes
- The attribution is read only in the blockquote form: in the paragraph-only form a last paragraph opening in bold would be misread.
- `--rf-title-size` is set on the role at raised specificity so the prominence ramp starts from the quote's resting size whatever the density.

{% /work %}
