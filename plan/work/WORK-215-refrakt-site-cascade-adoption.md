{% work id="WORK-215" status="ready" priority="medium" complexity="small" tags="site, cascade, tint, dogfood" source="SPEC-052" milestone="v0.14.0" %}

# Refrakt site adopts the tint cascade

Update the refrakt site's layout files so the cascade actually does something visible: root locked to dark; `docs/`, `runes/`, and `plan/docs/` explicitly unlocked and set to auto. The site becomes a live demo of the SPEC-052 cascade pattern.

Note: `/plan/*` on the site is *marketing for refrakt's planning system* (the `@refrakt-md/plan` plugin and CLI), so it correctly inherits the root's locked-dark default. Only `/plan/docs/*` (the plan system's documentation) flips to auto. The repo-root `plan/` directory is dev-only and isn't rendered on the site at all — no concern there.

## Acceptance Criteria

- [ ] `site/content/_layout.md` adds:
  ```yaml
  tint-mode: dark
  tint-lock: true
  ```
- [ ] `site/content/docs/_layout.md` adds:
  ```yaml
  tint-mode: auto
  tint-lock: false
  ```
- [ ] `site/content/runes/_layout.md` adds the same `tint-mode: auto, tint-lock: false`
- [ ] `site/content/plan/docs/_layout.md` adds the same `tint-mode: auto, tint-lock: false`
- [ ] `site/content/plan/_layout.md` (if it exists) does *not* unlock — `/plan/*` is plan-system marketing and correctly inherits the root's dark-locked default
- [ ] After the change, navigating the site shows:
  - [ ] Marketing pages (`/`, `/about`, `/blog/*`, `/plan/*`) render in dark, regardless of system preference
  - [ ] Theme toggle hidden on marketing pages (per the locked contract)
  - [ ] Docs pages (`/docs/*`, `/runes/*`, `/plan/docs/*`) respect saved user preference; toggle visible
  - [ ] Navigating from a docs page (light, by user choice) to a marketing page → marketing renders dark; toggle hides
  - [ ] Navigating back to a docs page → light returns; toggle reappears
- [ ] Visual regression / SSR snapshot for at least one page in each subtree confirms no flash of incorrect theme

## Approach

This is a small content edit (frontmatter updates on four layout files) that puts the whole SPEC-052 machinery on stage.

The `/plan/*` routes are *marketing pages for refrakt's planning system* (the `@refrakt-md/plan` plugin and CLI), not the repo-root `plan/` directory — that's dev-only and never rendered on the site. So `/plan/*` correctly inherits the root's dark-locked default with no special handling needed; only `/plan/docs/_layout.md` flips to auto.

Manual smoke test pass after deploying to dev server: click through every section of the site, confirm the toggle visibility flips at the expected boundaries, confirm no FOIT.

## Dependencies

- {% ref "WORK-211" /%} — theme toggle exists and honours `data-tint-lock`.
- {% ref "WORK-212" /%}, {% ref "WORK-213" /%}, {% ref "WORK-214" /%} — cascade machinery shipping.

## References

- {% ref "SPEC-052" /%} — "Refrakt Site Adoption" section with the configuration table
- Layout files: `site/content/_layout.md`, `site/content/docs/_layout.md`, `site/content/runes/_layout.md`, `site/content/plan/docs/_layout.md`

{% /work %}
