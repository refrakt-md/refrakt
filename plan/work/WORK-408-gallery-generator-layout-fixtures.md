{% work id="WORK-408" status="done" priority="medium" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,cli,gallery,layouts,tooling" %}

# Gallery generator — layout fixtures

Extend the gallery generator ({% ref "WORK-407" /%}) to a second subject class: **layout
fixtures** — representative sample pages rendered through each `LayoutConfig` so page chrome
(header, nav, sidebar, TOC, mobile panel, footer) is visually covered. Chrome carries as much of
a theme's identity as runes, and the skeleton/skin extraction touches `styles/layouts/*`, so this
is what lets the harness guarantee hold for chrome, not just content blocks.

## Scope

- Render the existing layouts (`default`, `docs`, `blog-article`, `plan`) via `renderPage` over a **synthetic multi-page context** so computed chrome (breadcrumb, TOC, nav tree, prev/next from the aggregate phase) populates.
- Emit per-layout artifacts suitable for **multi-viewport** capture (mobile / tablet / desktop).
- Default pre-enhancement chrome state is the baseline; enhanced states (mobile menu open) are an optional follow-on, out of scope here.

## Acceptance Criteria

- [x] The generator emits a fixture per existing layout, with computed chrome populated from a synthetic content set.
- [x] Fixtures render correctly at mobile / tablet / desktop widths.
- [x] Output is deterministic and theme-agnostic, consistent with the rune gallery.

## Dependencies

- Builds on {% ref "WORK-407" /%} (shared generator command).

## References

- {% ref "SPEC-094" /%} · `packages/transform/src/layouts.ts` · `packages/html/src/render.ts` · `packages/lumina/styles/layouts/*`.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-408-layout-fixtures`.

### What was done
- **`buildSyntheticPage()`** (`commands/gallery.ts`) — one synthetic `LayoutPageData` shared across all layouts: a representative article body (headings + prose + a `hint`), regions for `header` / `nav` (the nav fixture) / `footer` / `sidebar` / `pagination`, ~6 `pages`, `headings` (for the TOC), and blog `frontmatter` (title/date/author/tags). This populates the computed chrome (breadcrumb, TOC, nav tree, prev/next) and every region the four layouts source from.
- Render each built-in layout (`defaultLayout`, `docsLayout`, `blogArticleLayout`, `planLayout` from `@refrakt-md/transform`) via `layoutTransform → renderToHtml`, wrapped by the new **`renderLayoutDocument()`** (`lib/gallery.ts`) — a standalone full-page shell (theme CSS + fonts + behaviors, no gallery cell-grid chrome), so the layout *is* the page.
- Refactored the rune pipeline into a shared `sourceToTree()` (used by both rune cells and layout content/regions).
- Emits `<theme>.layout-<name>.<light|dark>.html` (8 files) alongside the rune gallery.

### Verified
- Chrome populates: docs → `rf-layout-docs` + `rf-docs-header` + `rf-docs-sidebar` + `rf-breadcrumb` + `rf-on-this-page`/`rf-toc` + `rf-nav`; blog-article → article header with date/author/title from frontmatter.
- Deterministic (layout fixtures byte-identical across runs); theme-agnostic (driven by `--theme` CSS + the built-in layout configs). 128 CLI tests green (incl. 2 new `renderLayoutDocument` tests).

### Notes
- Each layout is emitted as **one viewport-agnostic document**; the responsive layout CSS is width-driven, so the WORK-409 harness shoots each whole-page at mobile/tablet/desktop (per SPEC-094 §5). The gallery doesn't emit per-viewport HTML.
- Behaviors (mobile-menu, search, theme-toggle, section-nav) are wired by the same inlined `initPage` bundle as the rune gallery ({% ref "WORK-416" /%}).

{% /work %}
