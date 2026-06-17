---
"@refrakt-md/transform": patch
"@refrakt-md/runes": patch
"@refrakt-md/lumina": patch
"@refrakt-md/skeleton": patch
---

**Frame displacement gains a `bleed` mode and a longer offset ramp; bg gradients accept `transparent` and `name/alpha` stops; spacing-attribute overrides now win cleanly.**

- **`frame-displace-mode="bleed"`** — a second rendering model for `frame-displace`. `peek` (default) keeps the existing `transform: translate()` behaviour where a displaced media guest is cropped by its zone — correct for card / bento-cell. `bleed` puts a negative margin on the media zone so following layout pulls up and the guest extends past the host's edge with no gap above — useful for a hero or cta whose media should overflow downward.
- **Hero unclip** — when a hero's media zone contains a displaced guest (`data-displace` on the zone itself or on a child rune), the zone now opts out of `overflow: hidden` so the spill is actually visible. Card / bento-cell continue to clip into peeks; only section-like hosts unclip.
- **Extended `frame-offset` ramp** — adds `2xl` (4rem), `3xl` (6rem), `4xl` (8rem). Non-linear by design: `sm`–`xl` still ride the block-spacing tokens for peek granularity inside a card; `2xl`+ jumps to section-spacing so a bleed-mode displacement can clear a section's `padding-block` and have visible overhang.
- **`bg` gradient stops accept `transparent`** — `{% bg gradient="to-br" from="transparent" to="primary" %}` emits the literal CSS keyword, so a token-driven gradient can fade in or out without falling back to a raw-CSS preset.
- **`bg` gradient stops accept `name/alpha` shorthand** — Tailwind-style. `to="primary/0.5"` (decimal) or `to="primary/50"` (percent) compiles to `color-mix(in srgb, var(--rf-color-primary) 50%, transparent)`. Theme-aware: the colour still tracks `tint`.
- **`spacing="flush" | "tight" | …` overrides** — the universal-margin default selector in `dimensions/surfaces.css` was at specificity (0,3,0) because of its `:not([data-rune] [data-rune])` clause, beating the `[data-rune][data-spacing="…"]` attribute rules (0,2,0). Wrapping the default in `:where()` zeros its specificity so `spacing` (and per-rune / per-instance) overrides now win cleanly.
- **`sandbox` loses its hand-rolled `border-radius`** — sandbox now inherits whatever radius its host provides (or none), and the in-preview `border-radius: 0` workaround is dropped.
