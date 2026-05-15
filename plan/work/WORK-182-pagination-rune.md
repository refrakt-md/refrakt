{% work id="WORK-182" status="ready" priority="medium" complexity="moderate" tags="pagination, nav, postprocess, docs" source="SPEC-047" milestone="v0.13.0" %}

# Pagination rune for sequential page navigation

Add a `pagination` rune for prev/next links in sequential reading flows — tutorials, ordered docs, recipes. `{% pagination auto /%}` derives sibling order from any declared `nav` rune, falling back to frontmatter `order`, then directory order. `{% pagination prev="..." next="..." /%}` is the explicit escape hatch when authors want a curated sequence. Resolution piggybacks on the existing sentinel-postProcess pattern used by `breadcrumb auto` and `nav auto`.

## Acceptance Criteria

- [ ] `pagination` rune defined in `packages/runes/src/tags/pagination.ts` with attributes: `auto: boolean`, `prev: string` (slug or URL), `next: string` (slug or URL), `scope: 'siblings' | 'section'` (default `siblings`), `prev-label: string`, `next-label: string`
- [ ] `Pagination` config entry in `packages/runes/src/config.ts` producing `.rf-pagination` block on a `<nav>` element, with `prev`/`next` BEM elements (`.rf-pagination__prev`, `.rf-pagination__next`) and `data-direction="prev|next"` on each link for variant styling
- [ ] `auto` mode emits a `__pagination-auto` sentinel meta property at schema time; core `postProcess` resolves it during Phase 4 of the pipeline
- [ ] Sibling ordering follows priority: explicit `nav` order at the active layout (if the current page appears in any layout `nav` rune) → frontmatter `order` field → directory order (numeric prefixes respected: `01-intro.md` before `02-install.md`)
- [ ] Boundary handling: no prev link on the first sibling, no next link on the last; the wrapping `<nav>` still renders so theme spacing stays consistent. Engine's `if: { hasProperty }` clauses (or equivalent) drop the missing-side link cleanly
- [ ] Explicit `prev` / `next` (slug or absolute URL) work without `auto` and skip the sentinel resolution path
- [ ] Link label defaults to the target page's title from the registry; `prev-label` / `next-label` override per-side
- [ ] `scope="section"` widens the candidate set beyond direct siblings to all pages in the current top-level section; `scope="siblings"` (default) uses direct page-tree siblings only
- [ ] When the current page has children but no siblings of its own kind (i.e. it's a section index), auto mode renders nothing — verify against real site content during implementation; if the heuristic is wrong, add a `skip-empty` attribute instead
- [ ] Lumina ships CSS for `.rf-pagination`, `.rf-pagination__prev`, `.rf-pagination__next` with sensible defaults and a `[data-direction]` selector for the arrow / marker
- [ ] At least one docs section in `site/content/` uses `{% pagination auto /%}` via `_layout.md` so the feature is exercised end-to-end on the production site
- [ ] `npx refrakt inspect pagination --auto` shows the sentinel output; `npx refrakt inspect pagination --prev=foo --next=bar` shows resolved links
- [ ] CSS coverage tests updated for the new selectors
- [ ] Authoring docs (`site/content/docs/authoring/`) cover both auto and explicit forms with examples

## Approach

The rune follows the established sentinel pattern. Reference implementation: `BREADCRUMB_AUTO_SENTINEL` in `packages/runes/src/tags/breadcrumb.ts` and its resolution in `corePipelineHooks`. New code parallels that flow — emit a placeholder with a `__pagination-auto` meta property at schema time; resolve in postProcess once the cross-page registry and `pageTree` aggregate are populated.

The ordering-priority lookup is the meaty part. Pseudocode for postProcess:

1. Resolve the layout cascade for the current page; collect all `nav` renderables encountered. For each, check if the current page URL appears in its items; if so, take that nav's item order as the sequence and skip later sources.
2. If no nav contains the page, gather siblings from `pageTree` (direct siblings of the current page's parent, scoped per `scope` attribute). Sort by `frontmatter.order` (ascending, missing values sort to the end).
3. If `order` produces ties or missing values, fall back to directory order for the tied subset.
4. Find the current page's index; emit `prev` / `next` link tags. If at a boundary, omit that side.

The "current page is a section index with children" check looks at `pageTree`: if the page has children and the parent contains only this page as a sibling (or this page is the section root), skip auto pagination. Confirm the exact `pageTree` shape during implementation and adjust the heuristic if needed.

## Dependencies

None — independent of the SPEC-046 work items. Can ship in parallel with any of WORK-178…181.

## References

- {% ref "SPEC-047" /%} — full design (authoring surface, ordering priority table, engine config).
- `packages/runes/src/tags/breadcrumb.ts` — sentinel pattern (`BREADCRUMB_AUTO_SENTINEL`).
- `packages/content/src/pipeline.ts` — `runPipeline()` Phase 3 (`pageTree` aggregation) and Phase 4 (postProcess).
- `packages/content/src/frontmatter.ts` — `order` field on `Frontmatter`.
- `packages/runes/src/config.ts` — pattern for `corePipelineHooks` postProcess resolution.

{% /work %}
