---
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/lumina": minor
---

SPEC-087 surface fills. Adds a tint-tracking inset surface (the
`--rf-surface-inset-shift` mix amount + a use-site `color-mix` recipe applied to
media wells and `chart`/`diagram`), and `substrate` — a generated surface
pattern with a fixed engine enum (`dots|grid|lines|cross|checker|none`), inline
`substrate-size`/`opacity`/`fill` facets, a shared always-included gradient
recipe stylesheet, and `RuneConfig.substrateTarget` routing (default `self`,
per-instance `substrate-target` override, build warning when targeting a missing
media section).
