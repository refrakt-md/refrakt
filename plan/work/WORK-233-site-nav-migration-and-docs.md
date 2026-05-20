{% work id="WORK-233" status="ready" priority="medium" complexity="trivial" tags="nav, docs, site, migration" source="SPEC-055" milestone="v0.14.3" %}

# Site nav migration + authoring docs

Audit every `{% nav %}` in `site/content/` against the new resolution rules from {% ref "SPEC-055" /%} — flag any that now error, migrate to multi-segment slugs or explicit links as needed, and pick at least one nav to demonstrate multi-segment disambiguation in real content. Update the authoring docs to cover the resolution rules and the build error format. Update the `nav` rune reference page with the new behavior.

The editorial / IA pass after the engine and active-state work lands. Verifies SPEC-055 didn't regress anything and gives readers a working example of the disambiguation pattern.

## Acceptance Criteria

- [ ] Every `{% nav %}` instance in `site/content/` audited; each builds clean under WORK-231's resolver
- [ ] Any nav with previously-ambiguous bare slugs is migrated to multi-segment slugs or explicit links; commit message names the file(s)
- [ ] At least one site nav explicitly demonstrates multi-segment disambiguation in real content (e.g. a header / cross-section nav listing multiple "configuration" pages from different sections)
- [ ] Authoring docs at `site/content/docs/authoring/` gain a section on nav slug resolution — covers: the four item shapes (bare / multi-segment / absolute / explicit link), base directory derivation, and what happens on a resolution failure
- [ ] Build error format documented with a real example output so authors recognise it when they hit one
- [ ] `nav` rune reference page (`site/content/runes/nav.md` or equivalent) updated with the new resolution rules section; existing layout examples updated if their copy implied global slug matching
- [ ] Authoring docs cover the active state contract: `aria-current="page"` for the current page, `data-active="ancestor"` for the section the reader is inside
- [ ] At least one screenshot or annotated example showing the visual difference between current-page and ancestor states
- [ ] Site builds clean; no nav resolution errors in CI

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

{% /work %}
