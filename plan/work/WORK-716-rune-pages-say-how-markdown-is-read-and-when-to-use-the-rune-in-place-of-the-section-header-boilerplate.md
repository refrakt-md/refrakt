{% work id="WORK-716" status="ready" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, runes, orientation" milestone="v0.49.0" %}

# Rune pages say how Markdown is read and when to use the rune, in place of the Section header boilerplate

SPEC-193 D6 and D1.2, D1.4. The "Section header" paragraph is repeated on 20 rune pages (twelve with
a typo), and almost no page says when to use the rune rather than its neighbour.

## Acceptance Criteria
- [ ] The 20 "Section header" sections are removed
- [ ] Each rune that reinterprets Markdown has a short "How Markdown is read" table, one row covering the eyebrow, headline and blurb where it reads them, linking to Page sections
- [ ] Each rune with a neighbour a reader could mistake it for has a "when to use this" line in its opening (the pairs in SPEC-193 F7)
- [ ] `xref.md` says that `{% ref %}` is the same rune

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D1, D6, F5, F7.

{% /work %}
