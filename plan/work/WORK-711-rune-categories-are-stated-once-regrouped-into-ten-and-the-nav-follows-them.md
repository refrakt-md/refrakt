{% work id="WORK-711" status="ready" priority="high" complexity="moderate" source="SPEC-193" tags="docs, runes, nav, categories" milestone="v0.49.0" %}

# Rune categories are stated once, regrouped into ten, and the nav follows them

SPEC-193 D9 and D10. A rune's category is written in three places that drift (the rune nav, the
page's `category:` frontmatter, the rune definition's `category:`), and the rune nav is in no
order. The core runes regroup into ten categories by what the author is doing, checked against the
primitives the composition specs will add.

## Acceptance Criteria
- [ ] Every core rune page's `category:` frontmatter is one of the ten D10 categories, as D10's table assigns it
- [ ] Every rune definition's `category` (core `packages/runes/src/index.ts`, each plugin's `index.ts`) matches its page's, and a test fails when they differ
- [ ] The rune nav (`site/content/runes/_layout.md`) groups core runes by category and lists each group alphabetically by title; plugin runes stay grouped by plugin, the overview page first, then alphabetically
- [ ] A test fails on a rune page missing from the nav, in the wrong group, or out of order
- [ ] The rune catalogue renders the ten groups

## References
- {% ref "SPEC-193" /%}: D9, D10.

{% /work %}
