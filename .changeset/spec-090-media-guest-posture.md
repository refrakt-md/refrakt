---
"@refrakt-md/transform": minor
"@refrakt-md/runes": minor
"@refrakt-md/places": minor
"@refrakt-md/behaviors": minor
"@refrakt-md/lumina": minor
---

SPEC-090 media-guest interaction posture. A rune in another rune's media slot is
a presentational guest by default; interactivity is now an explicit capability —
`RuneConfig.interactive`, set on the behaviour-driven runes (`codegroup`, `tabs`,
`datatable`, `form`, `map`, `sandbox`, `juxtapose`). When the container is itself
an interaction target — a `card`/`bento-cell` with a stretched whole-tile `href`
— or the guest is a `cover` backdrop (SPEC-089), the engine marks the media zone
`data-guest-posture="presentational"`: it goes `pointer-events: none` (so clicks
fall through to the link / the overlay owns interaction) and the behaviours layer
skips enhancement, so the guest renders its static fallback (the demoted
`codegroup`/`tabs` tab strip is hidden so panels read as plain stacked content).
The demotion is scoped to the media zone only — content-overlay controls
(body/footer links & buttons) stay interactive. An interactive guest in a linked
tile emits an informative (non-fatal) build warning. A container without `href`
(and not `cover`) hosts interactive guests normally.
