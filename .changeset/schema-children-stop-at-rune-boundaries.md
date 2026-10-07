---
'@refrakt-md/runes': patch
---

A rune nested by an author is no longer published as one of its parent's children (WORK-609)

A schema table's `children` key matches by rune name as well as by `data-name`,
and several keys are also real rune names: `track`, `step`, `tier`,
`breadcrumb-item`. The match used to reach anywhere below the parent, so a rune
of that name the author had nested inside some other rune was claimed by the
parent and published in its JSON-LD with readable values:

- a `{% track %}` inside a `{% hint %}` in a playlist became one of the album's tracks
- a `{% steps %}` block inside a recipe tip became part of `recipeInstructions`
- a `{% tier %}` nested in another tier's body became one of the pricing table's offers

The match now stops at another rune's boundary. The nested rune keeps its own
structured data and is published as its own entity. A parent's own children
resolve exactly as before, and pages that do not nest a rune like this produce
the same output. The SEO baseline gains three fixtures for these cases.
Structure contracts are unchanged.

This adds the ownership marker (`data-owner`) from SPEC-146. A node placed inside
another rune on a rune's behalf will carry it, so the parent can still find that
node past the boundary. Nothing sets the marker yet, and it is removed before
rendering.
