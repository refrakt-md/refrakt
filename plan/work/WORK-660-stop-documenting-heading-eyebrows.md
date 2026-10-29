{% work id="WORK-660" status="ready" priority="medium" complexity="simple" source="ADR-046" tags="docs, section, eyebrow, page-sections" milestone="v0.44.0" %}

# Stop documenting heading eyebrows

{% ref "ADR-046" /%} decides that an eyebrow is a paragraph directly before the headline, never a
heading. The docs still teach the heading form. The guide's only example of it uses `hero`, which
renders it wrongly ({% ref "BUG-047" /%}), and nineteen rune pages say "a short paragraph or
heading" in the same boilerplate sentence.

The native page-section runes keep their grammar until each one is composed (ADR-046, decision
4), so some of them still accept the heading form. The docs stop recommending it anyway: it is
not the direction, and documenting less than a rune accepts is safe where documenting more is
not.

## Acceptance Criteria

- [x] The "Heading eyebrow + headline" section of `site/content/docs/authoring/page-sections.md` is removed, and the guide says an eyebrow is a short paragraph directly before the headline
- [x] The boilerplate sentence on every rune page that links to page sections says "a short paragraph", not "a short paragraph or heading" (nineteen pages, found with `grep -rn "paragraph or heading" site/content`)
- [x] No page under `site/content` describes or shows two leading headings as an eyebrow and a headline
- [x] `npm run format:md:check` passes

## Approach

Text-only. The nineteen pages share one sentence; change "Place a short paragraph or heading
before …" to "Place a short paragraph before …" in each, keeping the rest of each sentence as it
is. In the guide, delete the section and its example, and add one sentence to "Paragraph eyebrow
+ headline" saying a heading is never read as an eyebrow.

This fits beside {% ref "WORK-656" /%}, which makes the eyebrow a `section` role and also touches
the eyebrow docs, but it does not depend on it.

## References

- {% ref "ADR-046" /%}: the resolved open question.
- {% ref "SPEC-160" /%}: D7, no heading eyebrow in the composed `hero` and `cta`.
- {% ref "BUG-047" /%}: the documented example renders wrongly today.

{% /work %}
