{% work id="WORK-215" status="ready" priority="medium" complexity="small" tags="site, cascade, tint, dogfood" source="SPEC-052" milestone="v0.14.0" %}

# Refrakt site adopts the tint cascade

Update the refrakt site's layout files so the cascade actually does something visible: root locked to dark; `docs/`, `runes/`, `plan/` (all of it, including `specs/`, `work/`, `decisions/`, `milestones/`) explicitly unlocked and set to auto. The site becomes a live demo of the SPEC-052 cascade pattern.

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
- [ ] Plan content outside `/plan/docs/` — `plan/specs/`, `plan/work/`, `plan/decisions/`, `plan/milestones/` if any are publicly routed — also gets `tint-mode: auto, tint-lock: false`. Audit during implementation and either add layouts for each subdirectory or add at `site/content/plan/_layout.md` covering all of `/plan/**`. Capture the decision in the resolution
- [ ] After the change, navigating the site shows:
  - [ ] Marketing pages (`/`, `/about`, `/blog/*`) render in dark, regardless of system preference
  - [ ] Theme toggle hidden on marketing pages (per the locked contract)
  - [ ] Docs pages (`/docs/*`, `/runes/*`, `/plan/**`) respect saved user preference; toggle visible
  - [ ] Navigating from a docs page (light, by user choice) to a marketing page → marketing renders dark; toggle hides
  - [ ] Navigating back to a docs page → light returns; toggle reappears
- [ ] Visual regression / SSR snapshot for at least one page in each subtree confirms no flash of incorrect theme

## Approach

This is a small content edit (frontmatter updates on five-or-so layout files) that puts the whole SPEC-052 machinery on stage.

The plan content question is the one judgement call: `/plan/docs/` is specified, but `/plan/specs/`, `/plan/work/` etc. are not. If they're publicly routed on the site (which they appear to be), they're reading surfaces that want auto. Simplest implementation: add `tint-mode: auto, tint-lock: false` to a single `site/content/plan/_layout.md` so every plan subroute inherits it. If `/plan/docs/_layout.md` was already created in {% ref "SPEC-052" /%}'s spec text, it just inherits and the dedicated entry there becomes redundant — pick one.

Manual smoke test pass after deploying to dev server: click through every section of the site, confirm the toggle visibility flips at the expected boundaries, confirm no FOIT.

## Dependencies

- {% ref "WORK-211" /%} — theme toggle exists and honours `data-tint-lock`.
- {% ref "WORK-212" /%}, {% ref "WORK-213" /%}, {% ref "WORK-214" /%} — cascade machinery shipping.

## References

- {% ref "SPEC-052" /%} — "Refrakt Site Adoption" section with the configuration table
- Layout files: `site/content/_layout.md`, `site/content/docs/_layout.md`, `site/content/runes/_layout.md`, `site/content/plan/docs/_layout.md`

{% /work %}
