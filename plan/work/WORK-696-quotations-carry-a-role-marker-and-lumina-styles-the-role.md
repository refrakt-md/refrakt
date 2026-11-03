{% work id="WORK-696" status="in-progress" priority="medium" complexity="moderate" source="SPEC-185" tags="quotation, blockquote, theme, lumina" milestone="v0.47.0" %}

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

{% /work %}
