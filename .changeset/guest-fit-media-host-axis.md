---
"@refrakt-md/transform": patch
"@refrakt-md/skeleton": patch
"@refrakt-md/marketing": patch
"@refrakt-md/lumina": patch
---

Add a `guestFit` media-host axis so a theme declares whether a rune frames its media-zone guests or leaves them alone. `RuneConfig.guestFit: 'clip' | 'bleed'` (default `clip`) is emitted by the engine as `data-guest-fit` on the media zone, a sibling to `data-guest-posture`.

This fixes rich guests (`sandbox`, `codegroup`, `juxtapose`) being given rounded corners in bare section hosts like `hero` and `feature`: those now declare `guestFit: 'bleed'`, so a rune guest keeps its own chrome (its natural radius/border) instead of being masked by the slot — while leaf images still frame to the slot. Framed wells (`card`, `bento-cell`, …) keep `clip` and are unchanged, still merging a guest into the well as one surface. The shared rule replaces the per-host CSS so any rune can opt into either behavior from config.

`guestFit` also drives the displace containment default: a displaced guest now defaults to `peek` (cropped) in a clip host and `bleed` (spills) in a bleed host, so a hero no longer needs `frame-displace-mode="bleed"` spelled out (an explicit mode still overrides). The hero-specific media-zone unclip is retired in favour of the shared `data-guest-fit="bleed"` rule; the guest-intrinsic opt-outs (`preview`, `juxtapose`, displaced `showcase`) are unchanged.

A bleed host no longer clips its rune guest at all (not just on displace), so a guest's own drop-shadow is no longer cropped into the corner gaps left by its rounding — which showed as darker corners behind, e.g., a codegroup in a hero.
