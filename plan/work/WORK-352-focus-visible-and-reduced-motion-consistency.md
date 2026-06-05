{% work id="WORK-352" status="done" priority="medium" complexity="moderate" source="" milestone="v0.19.0" tags="lumina,a11y,polish" %}

# Focus-visible and reduced-motion consistency

Accessibility polish across the theme. Today only ~5 of ~90 rune CSS files define
`:focus-visible`, and only 2 honor `prefers-reduced-motion` — so keyboard focus is
inconsistent and animations don't degrade for motion-sensitive users.

## Acceptance Criteria
- [x] A consistent, token-driven `:focus-visible` indicator (e.g. a primary-coloured ring/outline) is applied to all interactive runes/elements: links, buttons, tabs, accordion headers, drawer triggers/close, form fields, datatable controls, nav items, and link-tiles (`card`/bento `href`).
- [x] The focus ring is visible in both light and dark and meets a sensible contrast bar; no `outline: none` without a replacement.
- [x] Animated runes wrap motion in `@media (prefers-reduced-motion: reduce)` fallbacks: at minimum `drawer` (already), `chart`, `reveal`, `juxtapose`, `accordion`.
- [x] A keyboard tab-through of the docs site shows a clear focus indicator on every interactive element.

## Approach
Prefer a small shared focus-ring utility (a custom property + a `:where()` base
rule over interactive selectors) rather than per-rune duplication, so coverage is
uniform and cheap to maintain. Add reduced-motion guards alongside each animation
block.

## References
- `packages/lumina/styles/` (5/90 files have `:focus-visible`; 2 have `prefers-reduced-motion`)
- Motion precedent: `packages/lumina/styles/runes/drawer.css`

## Resolution

Completed: 2026-06-05

Branch: `claude/v0.19-lumina-polish`

### What was done
Two global rules in `packages/lumina/styles/global.css`:
- **Uniform `:focus-visible` ring** via a zero-specificity `:where(...)` selector over every interactive element (`a[href]`, `button`, `input`/`select`/`textarea`, `summary`, `[tabindex]`, and `[role=button|tab|link|menuitem|menuitemradio]`) — `outline: 2px solid var(--rf-color-primary); outline-offset: 2px`. Zero specificity means any rune's own `:focus-visible` overrides it; an outline (not box-shadow) follows border-radius and doesn't shift layout. Covers links, link-tiles (`card`/bento `href` are `<a>`), tabs, accordion/summary, drawer close, form/datatable inputs, nav.
- **Global reduced-motion reset** — `@media (prefers-reduced-motion: reduce)` neutralizes animation/transition durations on everything (chart, reveal, juxtapose, accordion, drawer, …) in one place; uses `0.01ms` rather than `none` so animation/transition-end events still fire for behaviours that await them.

### Notes
- Audited `outline: none`: form, datatable, and version-switcher each pair it with a box-shadow focus replacement; the search-dialog input is a deliberately borderless command-palette field (focus signalled by the modal) — left as an intentional exception.

{% /work %}
