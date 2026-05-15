{% work id="WORK-184" status="ready" priority="medium" complexity="small" tags="site, layout, nav, pagination, dogfood" source="SPEC-046, SPEC-047" milestone="v0.13.0" %}

# Adopt new nav layouts and pagination across refrakt.md

Roll the new navigation primitives out to the refrakt.md site itself — eat our own dog food. Top-level `_layout.md` switches header to `menubar` and footer to `columns`. Docs and runes sidebars become `collapsible`. At least one section landing adopts the `cards` layout. Docs and runes `_layout.md` files add `{% pagination auto /%}` for sequential reading.

## Acceptance Criteria

### Header — menubar

- [ ] `site/content/_layout.md` `header` region replaces the plain markdown link row with `{% nav layout="menubar" %}`
- [ ] Header nav defines top-level items (logo / Docs / Blog / GitHub) and at least two grouped categories — proposed: `Product` (pricing, features, runes catalogue, plugins) and `Resources` (about, blog, changelog, plan)
- [ ] Exact group composition is decided as part of this work item; capture the chosen grouping in the resolution notes for future reference
- [ ] GitHub / external-link items keep working (verify the existing `{% icon name="github" /%}` pattern survives the migration)

### Footer — columns

- [ ] `site/content/_layout.md` `footer` region uses `{% nav layout="columns" %}` (or adds a footer region if one doesn't exist yet)
- [ ] Footer defines at least three columns (proposal: `Product`, `Resources`, `Legal`); column composition decided during implementation and captured in resolution notes
- [ ] Copyright / "small print" row stays as plain markdown beneath the nav (out of scope for a dedicated rune in this milestone)

### Sidebars — collapsible

- [ ] `site/content/docs/_layout.md` switches its sidebar `{% nav %}` to `{% nav collapsible %}`
- [ ] `site/content/runes/_layout.md` switches its sidebar `{% nav %}` to `{% nav collapsible %}`
- [ ] Verify on dev server: navigating to a page inside a group auto-expands only that group; other groups stay collapsed
- [ ] No `defaultOpen` overrides — rely entirely on URL-driven auto-open, since that's the demo case

### Section landing — cards

- [ ] At least one section landing page adopts `{% nav layout="cards" %}`. Candidates: `site/content/runes/rune-catalog.md`, `site/content/docs/index.md`, `site/content/docs/plugins/index.md`. Pick one and capture the choice in the resolution
- [ ] If the chosen page already has a hand-authored card grid (e.g. via `bento` or `feature`), replace it with the new nav-driven cards so the enrichment path is exercised
- [ ] For each child page referenced by the cards nav, verify the page has `title` and `description` frontmatter, and add `icon: <name>` frontmatter where one would help — pick a sensible icon from the Lumina set

### Pagination — docs and runes layouts

- [ ] `site/content/docs/_layout.md` adds `{% pagination auto /%}` (placed below the main `{% region name="content" %}` or in a dedicated `pagination` region the layout defines)
- [ ] `site/content/runes/_layout.md` adds `{% pagination auto /%}`
- [ ] Verify on dev server: navigating through docs / rune pages in order, prev / next links appear at the expected positions; first and last pages omit the appropriate side
- [ ] Verify ordering matches the declared `nav` order in each layout's sidebar — not directory order — since both layouts have an explicit `nav` order that should win

### Cross-cutting

- [ ] Dev server boots cleanly; no console warnings about the new runes
- [ ] `site && npm run build` succeeds
- [ ] At least one screen capture (or video) of the header dropdowns and the collapsible sidebar attached to the PR description for review

## Approach

This is a content-only work item — no engine or behavior code changes. Everything edits Markdown files in `site/content/`.

Sequence:

1. Header menubar first — biggest visible change, easiest to iterate on. Decide grouping in the PR description before writing.
2. Footer columns.
3. Sidebar collapsible — one-character change, but verify auto-open on multiple pages.
4. Cards adoption — pick the landing page, ensure child pages have `description` and (where useful) `icon` frontmatter.
5. Pagination — last, since it depends on the sidebar order being settled.

Run `cd site && npm run dev` and click through every region during implementation. Header dropdowns on desktop, hamburger on mobile (DevTools responsive), collapsible sidebar across multiple docs pages, cards on the chosen landing, prev/next on three or four sequential pages.

If anything in the dev rollout reveals a bug in the underlying features (WORK-178…182), open follow-up issues rather than fixing them here — this work item stays scoped to adoption.

## Dependencies

- {% ref "WORK-178" /%} — `layout="menubar"`, `layout="columns"`
- {% ref "WORK-179" /%} — `collapsible`
- {% ref "WORK-180" /%} — `cards`, `Frontmatter.icon`
- {% ref "WORK-181" /%} — menubar interactive behaviour (required for the header to actually work on click / mobile)
- {% ref "WORK-182" /%} — `pagination`

Can start once all five features have landed. Within this item, the five rollout sub-tasks are independent and could be split across PRs if the change set gets unwieldy.

## References

- {% ref "SPEC-046" /%}, {% ref "SPEC-047" /%} — design specs.
- {% ref "WORK-183" /%} — sibling docs work item; the rune reference pages.
- `site/content/_layout.md` — top-level layout with the current header.
- `site/content/docs/_layout.md`, `site/content/runes/_layout.md` — sidebars to make collapsible and to add pagination to.

{% /work %}
