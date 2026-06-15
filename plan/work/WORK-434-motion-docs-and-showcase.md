{% work id="WORK-434" status="ready" priority="medium" complexity="moderate" source="SPEC-105" milestone="v0.23.0" tags="motion,animation,docs,showcase,theme" %}

# Motion dimension — docs + showcase

{% ref "SPEC-105" /%} §7 + docs: a theme-authoring **motion dimension** page and an
author-facing `reveal`/`stagger` reference, plus a feature-stagger demonstration.

## Scope

- **Theme-authoring page** — the motion dimension: the closed vocabulary, the per-character
  *character contract* (what a theme must preserve vs is free to vary), the physics tokens,
  and how to choreograph across a rune's named parts (sync vs offset) — including the
  author-intent / theme-choreography / JS-when / CSS-how principle.
- **Author reference** — `reveal="none|fade|slide|scale|blur"` and `stagger`, with the
  opt-in default and the reduced-motion behaviour; a feature/bento stagger example.
- **Showcase** — a section that exercises `reveal` + `stagger` (a feature grid cascading in),
  demonstrating the global coverage and the reduced-motion/no-JS complete-render fallback.

## Acceptance Criteria

- [ ] A theme-authoring motion-dimension page documents the vocabulary, the character contract, the physics tokens, and choreography over named parts.
- [ ] An author-facing `reveal`/`stagger` reference documents the values, the opt-in default, and reduced-motion behaviour, with a feature-stagger example.
- [ ] A working showcase shows a cascading feature/bento; reduced-motion and no-JS render the complete static section; contracts green and CSS coverage passes.

## Dependencies

- {% ref "WORK-431" /%}, {% ref "WORK-432" /%}, {% ref "WORK-433" /%} — documents and demonstrates the whole dimension.

## References

- {% ref "SPEC-105" /%} §7 · `site/content/extend/theme-authoring/dimensions.md` · author rune reference docs.

{% /work %}
