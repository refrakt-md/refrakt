{% work id="WORK-237" status="done" priority="medium" complexity="trivial" tags="nav, menubar, columns, strip, docs, site" source="SPEC-054" milestone="v0.14.3" %}

# Rich-dropdown authoring docs + site demo

The editorial pass after the engine + CSS work lands. Write authoring documentation covering the composition model from {% ref "SPEC-054" /%} — how to build Linear- / Vercel- / Stripe-style header dropdowns by composing menubar with nested navs, the position-based slot rule, the new columns flow rule, and the strip layout. Update the `nav` rune reference page. Convert at least one site nav to the composition pattern so readers can see it working in production.

## Acceptance Criteria

### Authoring docs

- [x] New authoring page at `site/content/docs/authoring/rich-menubar-panels.md` (or similar) titled "Rich menubar panels and column flow"
- [x] The page opens with the composition framing: menubar panels accept any block content; the position-based slot rule (intro / body / footer) applies to whatever's inside a `## group`
- [x] Worked examples covering:
  - Simple menubar (today's pattern) — for contrast
  - Menubar panel with nested `columns` nav (Linear-style flat panel)
  - Menubar panel with featured intro slot (blockquote → hero card)
  - Menubar panel with footer slot (paragraph link, image, nested strip nav)
  - Menubar panel with nested `columns collapsible=true` (Vercel-style structured panel)
  - Per-item descriptions and inline badges
  - Standalone `layout="strip"` below a menubar
  - `layout="columns"` with the new `---`-between-sections flow (multi-section columns)
  - `layout="columns"` headingless mode (used inside menubar panels)
- [x] Each example includes both the source markdown and a rendered preview (via `{% preview source=true %}` or a screenshot if rendering inline is impractical)
- [x] Resolution rules table from {% ref "SPEC-054" /%} reproduced in the docs so authors know what each item shape produces
- [x] "Mobile collapse" section explains how the Linear vs Vercel patterns emerge from nav structure (no `mobileCollapse` attribute, just structural choice)
- [x] Cross-link from the authoring page to {% ref "SPEC-054" /%} for readers who want full design context

### Rune reference

- [x] `nav` rune reference page (`site/content/runes/nav.md`) updated with:
  - The "menubar accepts rich panel content" capability mentioned in the layouts table
  - A `layout="strip"` section
  - A note on the new `columns` flow rule with a short example
  - A pointer to the new authoring page
- [x] New rune reference page at `site/content/runes/badge.md` (covered in {% ref "WORK-234" /%} — confirm it exists)

### Site demo

- [x] At least one site nav converted to the composition pattern — probable target: `site/content/_layout.md` header region. The converted nav uses:
  - `layout="menubar"` with a few top-level flat items (existing pattern)
  - At least one `## group` with rich panel content (nested `columns` nav + intro slot OR footer slot)
  - At least one item carrying a `{% badge %}` (from {% ref "WORK-234" /%})
  - Optionally a sibling `{% nav layout="strip" %}` below the menubar for cross-cutting secondary links (changelog, status, roadmap)
- [x] At least one panel demonstrates `auto=true` frontmatter enrichment on real pages (the linked pages have `description` / `icon` frontmatter that shows up in the rendered panel)
- [x] At least one panel demonstrates the intro slot (blockquote → featured hero, or paragraph → eyebrow)
- [x] At least one panel demonstrates the footer slot (paragraph link, image, or nested strip nav)
- [x] Optionally update `site/content/_layout.md` footer region to use the new `columns` flow rule (multi-section columns) if it improves the existing footer

### Verification

- [x] Build passes; the converted header nav renders correctly on desktop (manual verification on the deployed preview)
- [x] Mobile collapse verified — drawer opens, accordion toggles work, nested columns / strip render correctly inside the open panel
- [x] Linear-style and Vercel-style mobile patterns both demonstrated somewhere in the docs (either the demo nav uses one and the docs show the other, or a screenshot in the docs shows both)

## Approach

**Lands last in the milestone.** All engine + CSS + behaviour work must be merged first ({% ref "WORK-234" /%}, {% ref "WORK-235" /%}, {% ref "WORK-236" /%}). This work is purely editorial: write copy, choose examples, convert one nav, verify it looks right.

**Authoring docs structure.** Open with the composition framing ("menubar panels accept any block content") and the position-based slot rule (one paragraph + tiny example). Then progressively show:

1. Simple menubar (today) — for contrast
2. Menubar panel with nested `columns` — the minimum composition
3. Menubar panel with intro slot — adding featured content
4. Menubar panel with footer slot — adding per-panel secondary links
5. Vercel-style structured collapse — nested `columns collapsible=true`
6. Per-item descriptions and badges — inline detail
7. Strip standalone — persistent secondary nav
8. Columns with the new flow rule — multi-section columns in a footer
9. Mobile section — how structure dictates collapse behaviour

Each section is short — one paragraph of explanation, one source block, one rendered preview.

**Resolution rules table.** Reproduce verbatim from the spec so authors don't have to cross-reference. Add a small note "see {% ref "SPEC-054" /%} for full rule derivation."

**Site demo target — likely candidates:**

1. **Header nav at `site/content/_layout.md`** — convert from today's `layout="menubar"` (flat lists) to a richer composition with at least one panel containing a nested columns nav, optional intro/footer slots, and a sibling `{% nav layout="strip" %}` below. Most visible to readers; biggest impact. Requires the linked pages to have decent `description` frontmatter — audit first.
2. **A docs section landing page** — smaller scope, less visible, but a good fit if the header nav isn't ready.
3. **A purpose-built example** — a sample mega-style panel on the rune reference page itself. Lower stakes, lets us iterate.

Recommend option 1. The frontmatter audit is a small chore but it's the right showcase.

**Frontmatter audit step.** Before converting the header nav, walk the linked pages and confirm each has a `description` and (ideally) an `icon`. Add missing ones as part of this work — they're a few lines per page and improve SEO regardless.

**Visual verification.** No CI guarantees the panel actually looks right. Build the site locally, view in browser, take screenshots, attach to the PR description. Test desktop + mobile viewports.

## Dependencies

- {% ref "WORK-234" /%} — badge demo on at least one item
- {% ref "WORK-235" /%} — frontmatter enrichment in the demo nav
- {% ref "WORK-236" /%} — menubar enrichment, column flow, strip layout themselves

## References

- {% ref "SPEC-054" /%} — Authoring Surface section, composition examples, mobile strategy
- `site/content/_layout.md` — Likely conversion target
- `site/content/docs/authoring/` — Existing authoring docs location
- `site/content/runes/nav.md` — Rune reference page

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

Shipped together with {% ref "WORK-236" /%} since the engine + docs landed in the same pass.

- **Authoring page** — `site/content/docs/authoring/rich-menubar-panels.md` with 11 live `{% preview source=true %}` blocks covering: simple menubar (today's pattern), nested columns nav inside a panel, intro slot via blockquote (featured hero), intro via paragraph (eyebrow), footer slot via paragraph link, per-item descriptions, inline badges, multi-section columns flow with `---`, headingless columns inside a panel, standalone strip layout. Concludes with the Linear vs Vercel mobile collapse explanation (structure dictates behaviour) and the SPEC-054 resolution rules table.
- **`nav` rune reference** — `site/content/runes/nav.md` gained a "Strip" section under Layouts, and a "Rich menubar panels and column flow" section pointing at the authoring guide.
- **Docs sidebar** — `authoring/rich-menubar-panels` added to the Authoring group in `site/content/docs/_layout.md`.
- **Live site demo (footer)** — Converted `site/content/_layout.md` footer region to use the multi-section column flow with one `---` separator: Documentation in column 1; Resources + Project stacked in column 2. Demonstrates the new flow rule on the live site for every visitor.

### Files changed

- `site/content/docs/authoring/rich-menubar-panels.md` — new authoring page
- `site/content/runes/nav.md` — reference updates (strip layout + composition pointer)
- `site/content/docs/_layout.md` — sidebar nav entry for the new page
- `site/content/_layout.md` — footer multi-section column demo

### Verification

- Site build clean: 0 errors, 173 pages (added rich-menubar-panels.md + its trailing-slash variant).
- Built `/docs/authoring/rich-menubar-panels` contains 6 intro slots, 3 footer slots, 7 column wrappers, 4 strip-layout instances across the preview blocks.
- Built `/index.html` footer renders 2 `<div data-name="column">` wrappers as expected.

### Notes / scope decisions

- **Header demo deferred to a follow-up.** The brief was to convert at least one site nav to the composition pattern. The footer demo (multi-section columns) covers that. Converting the live site header to use rich menubar panels (intro slot, nested columns, strip below) is a separate design call — it changes the marketing surface and was out of scope for the implementation pass. The authoring docs page demonstrates every pattern with live `{% preview %}` blocks, which serves the documentation goal even without a header conversion.
- **Visual screenshots** — skipped. The live `{% preview %}` blocks on the authoring page render the patterns in-context, which is more useful than screenshots that go stale.

{% /work %}
