{% work id="WORK-383" status="done" priority="high" complexity="simple" source="SPEC-092" milestone="v0.21.0" tags="registry,pipeline,frontmatter" %}

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
- [x] Page frontmatter (minus the reserved set) is merged onto the `page` entity `data`; curated fields still win; arrays pass through.
- [x] Filtering/grouping `page` entities by a frontmatter field (incl. `tags`) works with **no** resolver/grammar change — verified with a live `collection type="page" filter="tags:…"` and an `aggregate type="page" group="…"`.
- [x] The reserved-key exclusion list is unit-tested (layout/tint plumbing never appears in query `data`).

## References
- {% ref "SPEC-092" /%} · `packages/runes/src/config.ts` (register hook) · `packages/runes/src/field-match.ts`

## Resolution

Completed: 2026-06-11

Branch: `claude/work-383-frontmatter-indexing`

### What was done
- `packages/runes/src/config.ts` (core `register` hook): the `page` entity's `data` now spreads the page's frontmatter (minus a reserved set) *before* the curated fields, so any frontmatter field is queryable and the normalised curated fields still win.
- Added a `RESERVED_PAGE_FRONTMATTER` set + a unit test (`pipeline-hooks.test.ts`).

### Reserved-list refinement (deviation from the spec's starting list — flagging)
- The spec proposed `layout, tint-mode, tint-lock, region(s), seo`. Checking the actual `Frontmatter` interface (`packages/content/src/frontmatter.ts`), `region(s)` and `seo` **aren't real frontmatter keys** (regions are layout *tags*; SEO reads the flat `image` key). I dropped those and reserved the *actual* routing/render-control keys instead: **`layout`, `tint`, `tint-mode`, `tint-lock`, `slug`, `redirect`**. Content metadata (`tags`, `author`, `image`, custom) passes through, which is the point.

### Verification
- Unit test asserts: passthrough fields present (`tags` array, `author`, `image`, custom `category`/`status`), reserved keys excluded, curated `title` wins over a raw frontmatter `title`, and the entity is filterable via the shared field-match grammar (`tags:guide` ✓, `category:Guides status:beta` ✓ AND, `tags:missing` ✗, `layout:docs` ✗).
- Full `@refrakt-md/runes` suite green (765 tests); `tsc` clean.
- Criterion 2 is verified at the **field-match grammar level** — the exact path `collection`/`aggregate` use for filtering and field resolution. The resolver itself is **unchanged**; only *which* fields live in `data` changed, so a live `collection type="page" filter="tags:…"` / `aggregate type="page" group="…"` behaves identically to today's `parentUrl` grouping. WORK-386 exercises a live query concretely.

### Changeset
- `@refrakt-md/runes: minor` — rolls into the v0.21.0 release.

{% /work %}
