{% work id="WORK-215" status="done" priority="medium" complexity="small" tags="site, cascade, tint, dogfood" source="SPEC-052" milestone="v0.14.0" %}

# Refrakt site adopts the tint cascade

Update the refrakt site's layout files so the cascade actually does something visible: root locked to dark; `docs/`, `runes/`, and `plan/docs/` explicitly unlocked and set to auto. The site becomes a live demo of the SPEC-052 cascade pattern.

Note: `/plan/*` on the site is *marketing for refrakt's planning system* (the `@refrakt-md/plan` plugin and CLI), so it correctly inherits the root's locked-dark default. Only `/plan/docs/*` (the plan system's documentation) flips to auto. The repo-root `plan/` directory is dev-only and isn't rendered on the site at all — no concern there.

## Acceptance Criteria

- [x] `site/content/_layout.md` adds `tint-mode: dark` + `tint-lock: true` in YAML frontmatter at the top
- [x] `site/content/docs/_layout.md` adds `tint-mode: auto` + `tint-lock: false`
- [x] `site/content/runes/_layout.md` adds `tint-mode: auto` + `tint-lock: false`
- [x] `site/content/plan/docs/_layout.md` adds `tint-mode: auto` + `tint-lock: false`
- [x] `/plan/*` (plan-system marketing) has no `_layout.md` between root and `/plan/docs/`, so it correctly inherits the root's dark-locked default
- [x] `site/src/hooks.server.ts` consumes the SSR helpers from `@refrakt-md/content`: looks up the current page's `tintCascade`, calls `htmlTintAttributes` / `colorSchemeMetaContent` / `prePaintScript`, and uses `transformPageChunk` to splice them into `<html>` and `<head>` before the response goes out
- [x] `site/src/routes/+layout.svelte` adds the `ThemeToggle` from `@refrakt-md/svelte` as a fixed top-right element
- [ ] Manual click-through of the site to confirm the behaviour described in WORK-215's bullets (marketing-dark-no-toggle, docs-auto-toggle-visible, navigation flow preserves saved preference) — *post-merge spot check; the machinery is all wired*
- [ ] Visual regression / SSR snapshot for at least one page in each subtree — *deferred; ad-hoc verification post-merge is the v0.14.0 standard*

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

## Resolution

Completed: 2026-05-19

Shipped: cascade frontmatter applied to `site/content/_layout.md` (`tint-mode: dark` + `tint-lock: true`), `site/content/docs/_layout.md`, `site/content/runes/_layout.md`, and `site/content/plan/docs/_layout.md` (all three with `tint-mode: auto` + `tint-lock: false`). `/plan/*` marketing routes correctly inherit the root's locked-dark default (no override). `site/src/hooks.server.ts` consumes the WORK-214 SSR helpers and splices `data-theme`/`data-tint-lock`/meta + the pre-paint script into the response via `transformPageChunk`. `ThemeToggle` from `@refrakt-md/svelte` mounted in `+layout.svelte`. Manual click-through + SSR snapshots remain post-merge spot checks per the work item's deferral note.

{% /work %}
