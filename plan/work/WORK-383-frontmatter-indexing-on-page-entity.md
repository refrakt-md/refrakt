{% work id="WORK-383" status="ready" priority="high" complexity="simple" source="SPEC-092" milestone="v0.21.0" tags="registry,pipeline,frontmatter" %}

# Frontmatter indexing on the page entity

SPEC-092 Layer 1 — the small first strike that proves the registry-authoring loop.
Core registers every page as a `page` entity but copies only a fixed frontmatter
subset (`config.ts` register hook). Merge the *rest* of the page's frontmatter onto
the `page` entity's `data` so any field is queryable by the field-match grammar
(which already normalises arrays).

## Decisions (locked)
- **Passthrough-minus-reserved**, not an allowlist. Reserved (excluded) set:
  `layout`, `tint-mode`, `tint-lock`, `region`/`regions`, `seo`.
- The existing **curated fields win** (`title`, `description`, `date`, `order`,
  `icon`, `draft` keep their normalised values over a same-named raw value).
- Arrays pass through unchanged (`tags: [a, b]` matches member-wise).

## Acceptance Criteria
- [ ] Page frontmatter (minus the reserved set) is merged onto the `page` entity `data`; curated fields still win; arrays pass through.
- [ ] Filtering/grouping `page` entities by a frontmatter field (incl. `tags`) works with **no** resolver/grammar change — verified with a live `collection type="page" filter="tags:…"` and an `aggregate type="page" group="…"`.
- [ ] The reserved-key exclusion list is unit-tested (layout/tint plumbing never appears in query `data`).

## References
- {% ref "SPEC-092" /%} · `packages/runes/src/config.ts` (register hook) · `packages/runes/src/field-match.ts`

{% /work %}
