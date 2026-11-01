{% work id="WORK-697" status="ready" priority="medium" complexity="complex" source="SPEC-185" tags="pullquote, quotation, attribution, prominence, accessibility" milestone="v0.47.0" %}

# Pullquote is the featured quotation, with its attribution

SPEC-185 D2, D4, D6 (the after form) and D9: `pullquote` renders a featured quotation as a `<figure>`, reads its attribution from the paragraph after the quote, takes `prominence`, gains the `quote` alias, and deprecates `variant`.

## Acceptance Criteria
- [ ] `pullquote` renders `<figure data-quote="featured"><blockquote>…</blockquote>[<figcaption>…</figcaption>]</figure>`, never a nested blockquote (D4)
- [ ] `excerpt` renders an `<aside aria-hidden="true" data-quote="excerpt">` holding the same structure (D4)
- [ ] An attribution paragraph after the quote (`**Name** — Source`) is read as one group with it and rendered as `<figcaption>` with `<cite>` (D6)
- [ ] `quote` is an alias of `pullquote` (D4)
- [ ] The prominence facet applies to a featured quotation or an excerpt, and Lumina ramps the quote's size by step (D9)
- [ ] `variant` warns as deprecated, `accent` maps to `tint` and `prominence="prominent"`, and `align` stays (D2)
- [ ] The pullquote reference page describes roles, not looks, and shows the attribution and `excerpt`

## Blocked by

- {% ref "WORK-692" /%}
- {% ref "WORK-696" /%}

## References

- {% ref "SPEC-185" /%}: D2, D4, D6, D9.

{% /work %}
