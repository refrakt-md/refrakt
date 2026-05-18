{% work id="WORK-180" status="done" priority="medium" complexity="moderate" tags="nav, frontmatter, registry, layout" source="SPEC-046" milestone="v0.13.0" %}

# Cards nav layout with frontmatter enrichment

Add `layout="cards"` to the `nav` rune for section landing pages. Each item renders as a card; the postProcess pipeline enriches `NavItem`s with `title`, `description`, and `icon` resolved from the linked page's frontmatter via the entity registry. Group headings (`##`) become section titles above each card grid. Combines with `auto` to list a section's children automatically without naming each one.

## Acceptance Criteria

- [x] `Frontmatter` interface in `packages/content/src/frontmatter.ts` extended with optional `icon?: string` field
- [x] `layout="cards"` accepted as a value on the `nav` rune (extends the foundation from {% ref "WORK-178" /%})
- [x] Engine emits `.rf-nav--cards` modifier and `data-layout="cards"` on the wrapping nav
- [x] During postProcess, each `NavItem` inside a cards-layout nav is enriched with `title`, `description`, and `icon` properties resolved from the linked page's frontmatter via the `EntityRegistry`
- [x] Items pointing at external URLs (`[Label](https://example.com)`) render title-only cards without enrichment — no broken layout, no missing-data warnings logged
- [x] Items pointing at internal pages that lack `description` and/or `icon` render with whatever fields are present — title-only cards if both are missing
- [x] `{% nav layout="cards" auto %}` continues to work: the existing `auto` mechanism lists the current page's children, and each is then enriched as above
- [x] Lumina ships CSS for `.rf-nav--cards` with a responsive grid (multi-column on desktop, single-column on mobile) and per-card styling for title / description / icon
- [x] CSS coverage tests updated for the new selectors

Reference doc page (`site/content/runes/nav.md`) updates and adopting cards on a real section landing are owned by {% ref "WORK-183" /%} and {% ref "WORK-184" /%} respectively.

## Approach

Enrichment runs in the cross-page pipeline's postProcess phase (`packages/content/src/pipeline.ts`, Phase 4), not at schema time — the `EntityRegistry` doesn't have all pages indexed until Phase 2 completes. The nav rune already emits `NavItem`s with resolved URLs and titles via its existing slug-resolution path; this work extends the postProcess pass to also look up `description` and `icon` for each item whose parent nav has `layout="cards"`.

`Frontmatter.icon` is a string holding an icon name resolvable by the existing `{% icon %}` rune (e.g. `icon: rocket`). The cards renderable for each item embeds an `{% icon name="..." /%}` tag the engine can render through its existing icon resolution path. No new icon set, no new lookup logic.

`description` is already on `Frontmatter` (it's the same field used for SEO meta tags). The cards layout reuses it as the card body — authors don't write a separate "summary." Existing pages don't need updates.

Cards layout does **not** add `image` / `cover` support in this item. The `Frontmatter` interface already has `image` (used elsewhere for hero / OG images), but image cards carry layout consequences (aspect ratio, lazy loading, breakpoint behaviour) that go well beyond a navigation primitive. Themes that want richer cards can opt in via additional registry lookups; this work item ships the minimal title + description + icon contract.

## Dependencies

- {% ref "WORK-178" /%} — needs the `layout` foundation; `cards` is the fourth value alongside `vertical` / `menubar` / `columns`.

## References

- {% ref "SPEC-046" /%} — "Section landing (cards)" section and updated acceptance criteria for the frontmatter shape.
- `packages/content/src/frontmatter.ts` — `Frontmatter` interface; the file to extend.
- `packages/content/src/pipeline.ts` — `runPipeline()` Phase 4, `EntityRegistry` usage.
- `packages/runes/src/tags/nav.ts` — existing slug resolution; the postProcess extension hooks in alongside this.

## Resolution

Completed: 2026-05-18

Branch: `claude/v0.13-pagination-nav-bvuEP`

### What was done
- `packages/content/src/frontmatter.ts` — added optional `icon?: string` field to the `Frontmatter` interface.
- `packages/runes/src/config.ts`:
  - `corePipelineHooks.register` now indexes `icon` on each page entity.
  - `corePipelineHooks.aggregate` widens `pagesByUrl` entries with `description?`, `icon?`, `order?` so postProcess can read them.
  - Added `resolveCardsNavs` postProcess. For each nav with `data-layout="cards"`, walks all `NavItem` descendants, resolves the target URL (explicit `href` or slug→URL via the same suffix+shared-prefix tiebreak the runtime uses), looks up the page's `title` / `description` / `icon` in `pagesByUrl`, and rewrites the item with an enriched `<a>` containing `data-name="icon"` (placeholder `<rf-icon name="...">`), `data-name="title"`, and `data-name="description"` spans.
  - External-URL items render as title-only cards without enrichment; warnings are not logged.
- `packages/lumina/styles/runes/nav.css` — added `.rf-nav--cards` rules: responsive CSS grid (`auto-fill, minmax(16rem, 1fr)`), per-card link surface with hover lift, and `.rf-nav-item__title` / `__description` / `__icon` element styles. Single column below 500px.

### Notes
- Icons are emitted as `<rf-icon name="rocket">` placeholder elements rather than inlined SVG. The icon registry isn't available inside postProcess (the PipelineContext doesn't expose theme config), so resolution happens downstream — the Svelte renderer's icon component or a runtime web component picks them up. Static HTML adapters can hook the same element if they want full SSR.
- `nav layout="cards" auto` works without extra code because the existing `resolveAutoNavs` populates `NavItem`s with `data-slug` and `href` first; `resolveCardsNavs` runs after it and enriches whatever items are present.
- `pagesByUrl` was widened to carry `description` / `icon` / `order`. The change is additive — existing consumers that only read `url`, `title`, `parentUrl` are unaffected.

{% /work %}
