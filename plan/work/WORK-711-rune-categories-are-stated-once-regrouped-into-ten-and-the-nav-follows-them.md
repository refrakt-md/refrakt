{% work id="WORK-711" status="done" priority="high" complexity="moderate" source="SPEC-193" tags="docs, runes, nav, categories" milestone="v0.49.0" pr="refrakt-md/refrakt#778" %}

# Rune categories are stated once, regrouped into ten, and the nav follows them

SPEC-193 D9 and D10. A rune's category is written in three places that drift (the rune nav, the
page's `category:` frontmatter, the rune definition's `category:`), and the rune nav is in no
order. The core runes regroup into ten categories by what the author is doing, checked against the
primitives the composition specs will add.

## Acceptance Criteria
- [x] Every core rune page's `category:` frontmatter is one of the ten D10 categories, as D10's table assigns it
- [x] Every rune definition's `category` (core `packages/runes/src/index.ts`, each plugin's `index.ts`) matches its page's, and a test fails when they differ
- [x] The rune nav (`site/content/runes/_layout.md`) groups core runes by category and lists each group alphabetically by title; plugin runes stay grouped by plugin, the overview page first, then alphabetically
- [x] A test fails on a rune page missing from the nav, in the wrong group, or out of order
- [x] The rune catalogue renders the ten groups

## References
- {% ref "SPEC-193" /%}: D9, D10.

## Resolution

Completed: 2026-11-04

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#778

### What was done
- 54 core rune pages' `category:` and their definitions in `packages/runes/src/index.ts` take the ten D10 categories; `bg`, `tint` and `xref` gain the category they lacked.
- `packages/runes/src/plugins.ts`: `pluginRune()` sets a plugin rune's category to its plugin's `displayName` (an entry may still set one); the language server uses that rune as is. First-party plugins' per-entry categories and the plugin scaffold's are removed; docs' `displayName` is `Docs`.
- `site/content/runes/_layout.md`: core groups in D10 order, each alphabetical by title; plugin groups overview-first, then alphabetical. Same 117 items.
- `scripts/rune-categories.test.mjs`: category membership, definition-vs-page agreement (core and plugin), nav grouping, coverage and order; mutation-checked.

### Notes
- Plugin rune definition categories ("Semantic", "Section") were read only by the language server; `refrakt edit` already grouped plugin runes by display name.
- The catalogue renders the ten groups in first-seen order: `collection` has no group order (WORK-391) and `sort` takes one field.

{% /work %}
