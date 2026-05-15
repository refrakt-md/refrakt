{% work id="WORK-180" status="ready" priority="medium" complexity="moderate" tags="nav, frontmatter, registry, layout" source="SPEC-046" milestone="v0.13.0" %}

# Cards nav layout with frontmatter enrichment

Add `layout="cards"` to the `nav` rune for section landing pages. Each item renders as a card; the postProcess pipeline enriches `NavItem`s with `title`, `description`, and `icon` resolved from the linked page's frontmatter via the entity registry. Group headings (`##`) become section titles above each card grid. Combines with `auto` to list a section's children automatically without naming each one.

## Acceptance Criteria

- [ ] `Frontmatter` interface in `packages/content/src/frontmatter.ts` extended with optional `icon?: string` field
- [ ] `layout="cards"` accepted as a value on the `nav` rune (extends the foundation from {% ref "WORK-178" /%})
- [ ] Engine emits `.rf-nav--cards` modifier and `data-layout="cards"` on the wrapping nav
- [ ] During postProcess, each `NavItem` inside a cards-layout nav is enriched with `title`, `description`, and `icon` properties resolved from the linked page's frontmatter via the `EntityRegistry`
- [ ] Items pointing at external URLs (`[Label](https://example.com)`) render title-only cards without enrichment — no broken layout, no missing-data warnings logged
- [ ] Items pointing at internal pages that lack `description` and/or `icon` render with whatever fields are present — title-only cards if both are missing
- [ ] `{% nav layout="cards" auto %}` continues to work: the existing `auto` mechanism lists the current page's children, and each is then enriched as above
- [ ] Lumina ships CSS for `.rf-nav--cards` with a responsive grid (multi-column on desktop, single-column on mobile) and per-card styling for title / description / icon
- [ ] CSS coverage tests updated for the new selectors
- [ ] At least one section landing page in `site/content/` updated to demonstrate `{% nav layout="cards" %}` — the docs index or runes index is a natural target
- [ ] Authoring docs include a cards-layout example and document the `icon` frontmatter field

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

{% /work %}
