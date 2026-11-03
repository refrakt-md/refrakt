{% work id="WORK-696" status="done" priority="medium" complexity="moderate" source="SPEC-185" tags="quotation, blockquote, theme, lumina" milestone="v0.47.0" pr="refrakt-md/refrakt#761" %}

# Quotations carry a role marker, and Lumina styles the role

SPEC-185 D3: each quotation role carries `data-quote` on its outermost element, the core `blockquote` node marks a plain quotation, and Lumina styles roles rather than the bare element.

## Acceptance Criteria
- [x] The core `blockquote` node marks a quotation `data-quote="quotation"`; runes that reinterpret `>` carry no marker (D3.2–D3.3)
- [x] Lumina's global `blockquote` rule becomes its `[data-quote="quotation"]` rule, with a zero-specificity fallback for an unmarked blockquote (D3.5)
- [x] A quotation in the `ui` register is set quieter than one in `prose` (D3.6)
- [x] Lumina's per-rune undoing of the quotation style (recipe tips, comparison callouts and the like) is removed where the marker makes it unnecessary
- [x] The theme-authoring docs list the four roles and the marker as part of the theme contract, and state that a composition places the rune that is what it reinterprets (D3.4)

## References

- {% ref "SPEC-185" /%}: D3.

## Resolution

Completed: 2026-11-03

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `packages/runes/src/nodes.ts`: a `blockquote` node emitting `data-quote="quotation"`; `withoutQuoteRole` and `QUOTE_ATTR`, exported. Registered in `nodes`.
- `withoutQuoteRole` applied in `plugins/learning/src/tags/recipe.ts` (tips), `plugins/marketing/src/tags/testimonial.ts` (quote) and `packages/runes/src/tags/pullquote.ts`.
- `packages/transform/src/vocabulary.ts`: `QUOTE_ROLES`; `packages/runes/src/vocabulary.ts` adds the `quote` dimension.
- Lumina:
  - `styles/elements/blockquote.css`: `[data-quote="quotation"]`, the `ui` register rule, and the `:where(blockquote:not([data-quote]))` fallback;
  - `styles/runes/testimonial.css`: the glyph reset removed;
  - the skeleton testimonial comment updated.
- Tests: `packages/runes/test/quotation-role.test.ts`; the lumina vocabulary coverage known gaps; the composed-lore snapshot.
- Docs: theme-authoring `dimensions.md`, "Quotation roles".

### Visual review
- 16 pages with blockquotes compared before and after, light and dark.
- Intended changes: recipe tips lose a stray glyph over their text, and the pull quote shows its own declared glyph. Everything else is unchanged.

### Notes
- The other per-rune blockquote rules (api, symbol, spec, work, bug, decision, milestone, lore, howto) style a plain `>` in their bodies, which is still a quotation, so they stay. Only the testimonial reset became unnecessary.

{% /work %}
