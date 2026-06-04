{% work id="WORK-352" status="ready" priority="medium" complexity="moderate" source="" milestone="v0.19.0" tags="lumina,a11y,polish" %}

# Focus-visible and reduced-motion consistency

Accessibility polish across the theme. Today only ~5 of ~90 rune CSS files define
`:focus-visible`, and only 2 honor `prefers-reduced-motion` — so keyboard focus is
inconsistent and animations don't degrade for motion-sensitive users.

## Acceptance Criteria
- [ ] A consistent, token-driven `:focus-visible` indicator (e.g. a primary-coloured ring/outline) is applied to all interactive runes/elements: links, buttons, tabs, accordion headers, drawer triggers/close, form fields, datatable controls, nav items, and link-tiles (`card`/bento `href`).
- [ ] The focus ring is visible in both light and dark and meets a sensible contrast bar; no `outline: none` without a replacement.
- [ ] Animated runes wrap motion in `@media (prefers-reduced-motion: reduce)` fallbacks: at minimum `drawer` (already), `chart`, `reveal`, `juxtapose`, `accordion`.
- [ ] A keyboard tab-through of the docs site shows a clear focus indicator on every interactive element.

## Approach
Prefer a small shared focus-ring utility (a custom property + a `:where()` base
rule over interactive selectors) rather than per-rune duplication, so coverage is
uniform and cheap to maintain. Add reduced-motion guards alongside each animation
block.

## References
- `packages/lumina/styles/` (5/90 files have `:focus-visible`; 2 have `prefers-reduced-motion`)
- Motion precedent: `packages/lumina/styles/runes/drawer.css`

{% /work %}
