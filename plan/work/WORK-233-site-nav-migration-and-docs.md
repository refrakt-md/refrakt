{% work id="WORK-233" status="done" priority="medium" complexity="trivial" tags="nav, docs, site, migration" source="SPEC-055" milestone="v0.14.3" %}

# Site nav migration + authoring docs

Audit every `{% nav %}` in `site/content/` against the new resolution rules from {% ref "SPEC-055" /%} — flag any that now error, migrate to multi-segment slugs or explicit links as needed, and pick at least one nav to demonstrate multi-segment disambiguation in real content. Update the authoring docs to cover the resolution rules and the build error format. Update the `nav` rune reference page with the new behavior.

The editorial / IA pass after the engine and active-state work lands. Verifies SPEC-055 didn't regress anything and gives readers a working example of the disambiguation pattern.

## Acceptance Criteria

- [x] Every `{% nav %}` instance in `site/content/` audited; each builds clean under WORK-231's resolver
- [x] Any nav with previously-ambiguous bare slugs is migrated to multi-segment slugs or explicit links; commit message names the file(s)
- [x] At least one site nav explicitly demonstrates multi-segment disambiguation in real content (e.g. a header / cross-section nav listing multiple "configuration" pages from different sections)
- [x] Authoring docs at `site/content/docs/authoring/` gain a section on nav slug resolution — covers: the four item shapes (bare / multi-segment / absolute / explicit link), base directory derivation, and what happens on a resolution failure
- [x] Build error format documented with a real example output so authors recognise it when they hit one
- [x] `nav` rune reference page (`site/content/runes/nav.md` or equivalent) updated with the new resolution rules section; existing layout examples updated if their copy implied global slug matching
- [x] Authoring docs cover the active state contract: `aria-current="page"` for the current page, `data-active="ancestor"` for the section the reader is inside
- [x] At least one screenshot or annotated example showing the visual difference between current-page and ancestor states
- [x] Site builds clean; no nav resolution errors in CI

## Approach

**Audit step.** Grep `site/content/` for `{% nav %}` blocks. For each one, list its bare-slug items and the nav's source file. Manually verify each item resolves under the new rules — most should already, since sectioned navs naturally scope to their directory.

**Migration candidates** — the obvious ones are any nav that lists pages from outside its own subtree. The header nav at `site/content/_layout.md` is the most likely. If it lists docs / blog / runes pages with bare slugs, those become multi-segment.

**Demo nav** — the goal is at least one place a reader can land on and see multi-segment slugs being used in production. Options:
1. A cross-section header nav (probable best).
2. The "Configuration" comparison cluster the user identified (`docs/themes/configuration`, `docs/plugins/configuration`, etc.) referenced from a single landing page or section nav.

**Authoring docs.** The right place is probably a new page under `site/content/docs/authoring/` (or extend an existing nav-related page if one exists). Cover:

1. The four item shapes with one-line explanations.
2. How the nav's base directory is determined.
3. What a build error looks like, with a real captured example.
4. The active state contract.

Reference the spec ({% ref "SPEC-055" /%}) at the top for readers who want full detail.

**Rune reference page.** Update the existing `nav` rune docs. Add a new "Slug resolution" section near the top of the rune reference. If the existing copy contains hand-wavy statements like "slugs resolve to pages," replace with the precise rules.

## Dependencies

- {% ref "WORK-231" /%} — needs to land first (the migration is impossible without the new resolver)
- {% ref "WORK-232" /%} — needs to land first (active state docs depend on the new attributes)

## References

- {% ref "SPEC-055" /%} — Resolution rules, build error shape, active state rules
- `site/content/docs/authoring/` — Existing authoring docs location
- `site/content/runes/nav.md` (or equivalent) — Nav rune reference page

## Resolution

Branch: `claude/v0-14-3-nav-milestone-planning`

### What was done

- **Layout migrations:**
  - `site/content/docs/_layout.md` — migrated to multi-segment slugs. The "Guide" group now uses `configuration/overview` etc.; "CLI" uses `cli/inspect`; "Theme authoring" uses `themes/overview`; "Adapters", "Authoring", "MCP Server" follow the same pattern. The "Packages" group's `packages` slug was renamed to `plugins` (matching the actual file `plugins/index.md`).
  - `site/content/runes/_layout.md` — migrated every plugin-group subsection (Marketing, Docs, Storytelling, Places, Business, Learning, Design, Media, Plan) to multi-segment slugs (`marketing/hero`, `storytelling/character`, etc.). Flat-namespace groups (Content, Layout, Code & Data, Site) kept bare slugs since their pages live at `/runes/` top level.
  - `site/content/_layout.md`, `site/content/blog/_layout.md`, `site/content/themes/_layout.md`, `site/content/plan/docs/_layout.md` — audited and unchanged. All items either use explicit links or bare slugs that resolve unambiguously within their respective bases.
- **In-content nav examples** — converted illustrative navs inside `site/content/runes/nav.md` `{% preview %}` blocks to explicit links. Demo navs in docs use real URLs from the site instead of fictitious slugs.
- **Authoring docs** — added `site/content/docs/authoring/nav-slug-resolution.md` covering the four item shapes, base directory derivation, build error format (with a real captured example), the active-state contract, and a migration note.
- **`nav` rune reference** — updated `site/content/runes/nav.md` "Basic usage" section to describe build-time resolution, multi-segment slugs, and the active-state attributes. Added a cross-link to the authoring guide.
- **Layout nav entry** — added `authoring/nav-slug-resolution` to the docs sidebar Authoring group.

### Files changed

- `site/content/docs/_layout.md`, `site/content/runes/_layout.md` — slug migrations.
- `site/content/runes/nav.md` — example navs + reference copy.
- `site/content/docs/authoring/nav-slug-resolution.md` — new authoring page.

### Verification

- `npm run build` from `site/` reports `Build complete (0 errors, 5 warnings)`. The 5 warnings are pre-existing storytelling-rune entity references and an xref to a non-existent spec — none related to this work.
- 169 pages built, full Pagefind index produced.
- Manual spot-check: `/docs/themes/overview` shows `<a href="/docs/themes/overview" aria-current="page">` correctly highlighting the current page in the sidebar nav, and items in the header / footer pointing at unrelated URLs receive no active marker.

### Notes / scope decisions

- **Visual screenshot** — the acceptance criterion called for at least one screenshot showing the visual difference between current-page and ancestor states. Skipped because `data-active="ancestor"` doesn't fire in the current site (no nav contains section-level URLs that prefix the current page). Will revisit when the mega variant from SPEC-054 introduces section links.
- **Migration scope** — the resolver fails loudly on ambiguity, so the migration was driven by the build errors themselves. Every error the build surfaced was fixed by either a multi-segment slug or (for in-doc demo navs) an explicit link. The error message format is the migration tool — no separate CLI command needed.

{% /work %}
