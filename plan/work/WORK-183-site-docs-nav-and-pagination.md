{% work id="WORK-183" status="ready" priority="medium" complexity="small" tags="docs, site, nav, pagination" source="SPEC-046, SPEC-047" milestone="v0.13.0" %}

# Site reference docs for new nav layouts and the pagination rune

Update `site/content/runes/nav.md` so it documents every new `layout` value with live `preview` blocks, and create `site/content/runes/pagination.md` from scratch covering both auto and explicit forms. Reference-doc work only — site adoption (changing `_layout.md` files in production) is owned by {% ref "WORK-184" /%}.

## Acceptance Criteria

### `site/content/runes/nav.md` updates

- [ ] Intro rewritten to reflect that `nav` is the single primitive for sidebar, header menubar, footer columns, and section-landing cards — not just sidebars
- [ ] `layout` attribute added to the Attributes table with values `vertical` (default), `menubar`, `columns`, `cards`
- [ ] `collapsible` boolean attribute added to the Attributes table
- [ ] `defaultOpen` attribute added to the Attributes table (comma-separated group titles)
- [ ] A `## Layouts` section with one subsection per value, each containing a `{% preview %}` block showing the markdoc source and the rendered output:
  - [ ] `### Vertical (sidebar)` — current behaviour, default
  - [ ] `### Menubar (header)` — example with two groups (Product, Resources), each with a couple of items; note dropdown / hamburger behaviour
  - [ ] `### Columns (footer)` — example with three groups (Product, Resources, Legal)
  - [ ] `### Cards (section landing)` — example with explicit slugs; show enriched output with title + description + icon
- [ ] A `## Collapsible sidebars` section with a `{% preview %}` example demonstrating `{% nav collapsible %}` and explaining the auto-open-current-section behaviour
- [ ] A short `## Frontmatter fields used by cards` section documenting that the cards layout reads `title`, `description`, and (new) `icon` from each linked page's frontmatter, with a tiny YAML example
- [ ] A `## Mobile behaviour` callout (or section) noting that menubars collapse to a hamburger below the breakpoint and that columns stack — both handled by Lumina, no author work required
- [ ] Cross-references to {% ref "WORK-184" /%} are NOT included in the rendered docs; the doc page itself is timeless

### `site/content/runes/pagination.md` (new file)

- [ ] Frontmatter: `title: Pagination` and a `description` line
- [ ] Intro paragraph naming the use case (sequential reading — tutorials, ordered docs, recipes) and contrasting with `breadcrumb` and `nav`
- [ ] `## Basic usage` section with a `{% preview %}` showing `{% pagination auto /%}` placed in a `_layout.md`
- [ ] `## Explicit prev / next` section with a `{% preview %}` showing `{% pagination prev="install" next="configuration" /%}`
- [ ] `## Ordering` section explaining the priority — declared `nav` order → frontmatter `order` → directory order — with a short worked example
- [ ] `### Attributes` table covering `auto`, `prev`, `next`, `scope`, `prev-label`, `next-label`
- [ ] `### Common attributes` table identical to other rune docs (the shared layout / spacing / inset / tint / bg row)
- [ ] A note on boundary behaviour (no wrap-around; first page → no prev link, last → no next)
- [ ] A note on the `scope="section"` value and when to use it

### Cross-cutting

- [ ] `site/content/runes/_layout.md` updated to add `pagination` to the appropriate group in the rune catalog sidebar (likely under `Site`, next to `nav`, `toc`, `breadcrumb`)
- [ ] `site/content/runes/rune-catalog.md` (or wherever the catalog is generated / curated) lists the pagination rune
- [ ] All new `{% preview %}` blocks render correctly (verify with `cd site && npm run dev`)
- [ ] Authoring docs in `site/content/docs/authoring/` are reviewed; if they have a section that lists rune examples or content-model patterns that should mention the new layouts, update them — otherwise no changes needed

## Approach

Both pages follow the existing rune-doc convention seen in `site/content/runes/nav.md` and the other rune pages: short intro, `## Basic usage` with a markdoc code block (or `{% preview %}` for live examples), `### Attributes` table, `### Common attributes` table.

`{% preview %}` is the right primitive for showing layouts because it renders the actual rune output alongside the source — much more useful than a static code block for visual primitives like `cards` and `menubar`. If `preview` is unavailable for any reason in a given environment, fall back to a code block plus a separate "Rendered output" screenshot.

The cards-layout preview will need at least one or two example child pages with `description` and `icon` set in frontmatter so the enrichment is visible. The `site/content/runes/*.md` pages already have `description` on every page; for `icon`, pick a couple of existing rune pages and add `icon: ...` frontmatter as part of this work item (small, mechanical, doesn't change rendered output until cards is used).

This is intentionally a docs-only work item — no code changes. Depends on the feature items having shipped so the examples actually render.

## Dependencies

- {% ref "WORK-178" /%} — `layout` attribute available
- {% ref "WORK-179" /%} — `collapsible` available
- {% ref "WORK-180" /%} — `cards` and `Frontmatter.icon` available
- {% ref "WORK-181" /%} — menubar behaviour available (so the menubar preview actually opens dropdowns)
- {% ref "WORK-182" /%} — `pagination` rune available

## References

- {% ref "SPEC-046" /%}, {% ref "SPEC-047" /%} — design specs.
- `site/content/runes/nav.md` — existing rune doc structure to extend.
- Any existing `site/content/runes/*.md` page that uses `{% preview %}` — reference for the preview pattern.

{% /work %}
