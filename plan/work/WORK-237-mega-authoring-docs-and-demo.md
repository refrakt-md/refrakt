{% work id="WORK-237" status="ready" priority="medium" complexity="trivial" tags="nav, mega-menu, docs, site" source="SPEC-054" milestone="v0.14.3" %}

# Mega + strip authoring docs + site demo

The editorial pass after the mega + strip engine and CSS land. Write authoring documentation covering the position-based slot rule (intro / columns / footer), the patterns from {% ref "SPEC-054" /%}, and the strip layout. Update the `nav` rune reference page with `layout="mega"` and `layout="strip"` sections. Convert at least one site nav to mega so readers can see it working in production.

## Acceptance Criteria

- [ ] New authoring page at `site/content/docs/authoring/mega-menu.md` (or similar) titled "Mega menu navigation"
- [ ] The page opens with the position-based slot rule (`---`-separated segments → columns / content slots → intro / footer) and a simple worked example
- [ ] Covers each authoring pattern from {% ref "SPEC-054" /%}: fully-auto with `auto=true`, per-panel intro slots (blockquote → featured hero, paragraph → eyebrow), per-panel footer slots (paragraph with link, image, nested `{% nav layout="strip" %}`), inline descriptions and badges, mixed auto with selective overrides
- [ ] Each pattern includes both the source markdown and a rendered preview (via `{% preview source=true %}` or a screenshot if rendering inline is impractical)
- [ ] Resolution rules table from {% ref "SPEC-054" /%} reproduced in the docs so authors know what each item shape produces
- [ ] Strip layout documented in its own short section — standalone usage (persistent secondary nav below the menubar) and nested usage (inside a mega panel's footer slot)
- [ ] `nav` rune reference page (`site/content/runes/nav.md`) gains a `layout="mega"` section and a `layout="strip"` section, each pointing at the authoring page for full usage
- [ ] At least one site nav converted to `layout="mega"` — probable target: `site/content/_layout.md` header region with the docs / runes / themes top-level groups expanded into mega panels
- [ ] The converted site nav demonstrates frontmatter-derived descriptions (via `auto=true`) on real pages — i.e. at least a few of the linked pages have `description` frontmatter that shows up in the panel
- [ ] At least one item in the demo nav carries a `{% badge %}` (from {% ref "WORK-234" /%}) showing the integration
- [ ] At least one panel in the demo nav uses a `---` column split if the panel has enough items to warrant it
- [ ] At least one panel demonstrates the intro slot (blockquote or paragraph)
- [ ] At least one panel demonstrates the footer slot (paragraph link, image, or nested strip nav)
- [ ] The demo nav optionally includes a `{% nav layout="strip" %}` sibling below the mega for cross-cutting secondary links (changelog, status, roadmap)
- [ ] Build passes; mega menu renders correctly on desktop and mobile (manual verification on the deployed preview)
- [ ] Mobile collapse behaviour verified — narrow viewport shows the stacked-accordion fallback from WORK-236; strip wraps cleanly
- [ ] Cross-link from the authoring page to {% ref "SPEC-054" /%} for readers who want full design context

## Approach

**Lands last in the milestone.** All engine + CSS + behavior work must be merged first ({% ref "WORK-234" /%}, {% ref "WORK-235" /%}, {% ref "WORK-236" /%}). This work item is purely editorial: write copy, choose examples, convert one nav, verify it looks right.

**Authoring docs structure.** Open with the position-based slot rule (one-paragraph explanation + tiny example), then progressively show: simple full-auto panel, intro with featured blockquote, intro with eyebrow paragraph, column splits, footer with paragraph/image/nested-strip, per-item descriptions and badges. Each section is short — one paragraph of explanation, one source block, one rendered preview.

**Resolution rules table.** Reproduce verbatim from the spec so authors don't have to cross-reference. Add a small note "see {% ref "SPEC-054" /%} for full rule derivation."

**Site demo target — likely candidates:**

1. **Header nav at `site/content/_layout.md`** — convert from `layout="menubar"` to `layout="mega"` with a sibling `{% nav layout="strip" %}` for changelog/roadmap/status links. Most visible to readers; biggest impact. Requires the linked pages to have decent `description` frontmatter — audit first.
2. **A docs section landing page** — smaller scope, less visible, but a good fit if the header nav isn't ready for mega.
3. **A purpose-built example** — a sample mega panel on the rune reference page itself. Lower stakes, lets us iterate.

Recommend option 1. The frontmatter audit is a small chore but it's the right showcase.

**Frontmatter audit step.** Before converting the header nav, walk the linked pages and confirm each has a `description` and (ideally) an `icon`. Add missing ones as part of this work item — they're a few lines per page and improve SEO regardless.

**Visual verification.** No CI guarantees the panel actually looks right. Build the site locally, view in browser, take screenshots, attach to the PR description. Test desktop + mobile viewports.

## Dependencies

- {% ref "WORK-234" /%} — badge demo on at least one item
- {% ref "WORK-235" /%} — frontmatter enrichment in the demo nav
- {% ref "WORK-236" /%} — mega + strip layouts themselves

## References

- {% ref "SPEC-054" /%} — Authoring Surface section, position-based slot rule, resolution rules table, strip layout description
- `site/content/_layout.md` — Likely conversion target
- `site/content/docs/authoring/` — Existing authoring docs location
- `site/content/runes/nav.md` — Rune reference page

{% /work %}
