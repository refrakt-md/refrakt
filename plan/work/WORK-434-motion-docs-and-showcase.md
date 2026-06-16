{% work id="WORK-434" status="done" priority="medium" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,animation,docs,showcase,theme" %}

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

- [x] A theme-authoring motion-dimension page documents the vocabulary, the character contract, the physics tokens, and choreography over named parts.
- [x] An author-facing `reveal`/`stagger` reference documents the values, the opt-in default, and reduced-motion behaviour, with a feature-stagger example.
- [x] A working showcase shows a cascading feature/bento; reduced-motion and no-JS render the complete static section; contracts green and CSS coverage passes.

## Dependencies

- {% ref "WORK-431" /%}, {% ref "WORK-432" /%}, {% ref "WORK-433" /%} — documents and demonstrates the whole dimension.

## References

- {% ref "SPEC-105" /%} §7 · `site/content/extend/theme-authoring/dimensions.md` · author rune reference docs.

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work431-reveal-facet` (continued).

### What was done
- **Theme-authoring motion page** — `site/content/extend/theme-authoring/motion.md`: the three-layer split (author intent / engine contract / theme choreography / behaviour timing), the closed `reveal` character contract (what a theme must preserve vs vary), the physics-token table (the `--rf-reveal-*` knobs + Lumina defaults), how the `data-reveal` × `data-in-view` CSS works, the transform-composition rule (individual `translate`/`scale`, never `transform`), the `--rf-reveal-index` stagger mechanism, opt-in per-part choreography over named anatomy, the `data-animate` enhancement gate, and a "write your own motion.css" contract. Added a **Motion** row to the dimensions overview table linking to it.
- **Author-facing reference** — `site/content/runes/motion.md`: the two universal attributes, the `reveal` vocabulary (character-not-mechanics framing), `stagger` (multi-child only, composes with any character), the build-error-on-unknown note, accessibility/no-JS guarantees (opt-in, reduced-motion, complete static render), the direction-is-theme's note, and a worked feature-stagger example. Cross-links to the theme page.
- **Showcase** — the home page (`site/content/index.md`, committed earlier) drives all four characters + two stagger cascades across its seven sections.
- Wired both pages into nav (`runes/_layout.md` Essentials; `extend/_layout.md` theme-authoring, after dimensions).

### Verification
- Production build: 217 pages (the two new pages parse + render), cross-links resolve, nav entries present, both pages carry their full content (tables, tokens, examples). The only build error is the pre-existing SPEC-041 duplicate-id (unrelated).
- The home-page showcase renders the cascade (`--rf-reveal-index` 0–5 and 0–8) and is fully visible without JS (motion gated behind `data-animate`).
- No package source changed for this item (docs/content only); the WORK-432/433 suite (3382) stays green, contracts in sync, CSS coverage passes.

### Notes
- This closes the SPEC-105 motion thread: WORK-431 (engine facet) → 432 (CSS+tokens) ∥ 433 (behaviour) → 434 (docs+showcase), all on this branch.

{% /work %}
