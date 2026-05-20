{% work id="WORK-237" status="ready" priority="medium" complexity="trivial" tags="nav, mega-menu, docs, site" source="SPEC-054" milestone="v0.14.3" %}

# Mega authoring docs + site demo

The editorial pass after the mega layout engine and CSS land. Write authoring documentation covering the four sketch patterns from {% ref "SPEC-054" /%} (full-auto, manual descriptions + featured, mixed, eyebrow labels), update the `nav` rune reference page with a `layout="mega"` section, and convert at least one site nav to mega so readers can see it working in production.

## Acceptance Criteria

- [ ] New authoring page (or expanded existing page) at `site/content/docs/authoring/` titled "Mega menu navigation" or similar
- [ ] The page covers all four authoring patterns from {% ref "SPEC-054" /%}: fully-auto with `auto=true`, manual descriptions + featured blockquote, mixed auto with selective overrides, eyebrow labels via paragraph-under-heading
- [ ] Each pattern includes both the source markdown and a rendered example (or a screenshot if rendering inline is impractical)
- [ ] Resolution rules table from {% ref "SPEC-054" /%} reproduced in the docs so authors know what each item shape produces
- [ ] Trigger-to-group slug matching documented, with the recommended convention and a note about the build error on mismatch
- [ ] Footer band, column splits (`---`), eyebrow paragraphs, and featured blockquotes each documented with a minimal example
- [ ] `nav` rune reference page (`site/content/runes/nav.md` or equivalent) gains a `layout="mega"` section listing the new attribute value and pointing at the authoring page for full usage
- [ ] At least one site nav converted to `layout="mega"` — probable target: `site/content/_layout.md` header region with the docs / runes / themes / blog top-level triggers expanded into mega panels
- [ ] The converted site nav demonstrates frontmatter-derived descriptions (via `auto=true`) on real pages — i.e. at least a few of the linked pages have `description` frontmatter that shows up in the panel
- [ ] At least one item in the demo nav carries a `{% badge %}` (from WORK-234) showing the integration
- [ ] At least one group in the demo nav uses a `---` column split if the group has enough items to warrant it
- [ ] At least one group includes an eyebrow paragraph and / or a featured blockquote
- [ ] Build passes; mega menu renders correctly on desktop and mobile (manual verification on the deployed preview)
- [ ] Mobile collapse behavior verified — narrow viewport shows the stacked-accordion fallback from WORK-236
- [ ] Cross-link from the authoring page to {% ref "SPEC-054" /%} for readers who want full design context

## Approach

**Lands last in the milestone.** All engine + CSS + behavior work must be merged first (WORK-234, WORK-235, WORK-236). This work item is purely editorial: write copy, choose examples, convert one nav, verify it looks right.

**Authoring docs structure.** Open with the simplest pattern (full-auto, one trigger, one group), then progressively show: column splits, descriptions, featured items, eyebrow labels, footer band. Each section is short — one paragraph of explanation, one source block, one rendered or screenshotted example.

**Resolution rules table.** Reproduce verbatim from the spec so authors don't have to cross-reference. Add a small note "see {% ref "SPEC-054" /%} for full rule derivation."

**Site demo target — likely candidates:**

1. **Header nav at `site/content/_layout.md`** — convert from `layout="menubar"` to `layout="mega"`. Most visible to readers; biggest impact. Requires the linked pages to have decent `description` frontmatter — audit first.
2. **A docs section landing page** — smaller scope, less visible, but a good fit if the header nav isn't ready for mega.
3. **A purpose-built example** — a sample mega panel on the rune reference page itself. Lower stakes, lets us iterate.

Recommend option 1. The frontmatter audit is a small chore but it's the right showcase.

**Frontmatter audit step.** Before converting the header nav, walk the linked pages and confirm each has a `description` and (ideally) an `icon`. Add missing ones as part of this work item — they're a few lines per page and improve SEO regardless.

**Visual verification.** No CI guarantees the panel actually looks right. Build the site locally, view in browser, take screenshots, attach to the PR description. Test desktop + mobile viewports.

## Dependencies

- {% ref "WORK-234" /%} — badge demo on at least one item
- {% ref "WORK-235" /%} — frontmatter enrichment in the demo nav
- {% ref "WORK-236" /%} — mega layout itself

## References

- {% ref "SPEC-054" /%} — Authoring Surface section, four sketch patterns, resolution rules table
- `site/content/_layout.md` — Likely conversion target
- `site/content/docs/authoring/` — Existing authoring docs location
- `site/content/runes/nav.md` (or equivalent) — Rune reference page

{% /work %}
