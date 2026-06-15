---
"@refrakt-md/skeleton": minor
"@refrakt-md/lumina": minor
"@refrakt-md/sveltekit": minor
---

**New `@refrakt-md/skeleton` package + cascade-layer infrastructure (SPEC-094 §3).** Stands up the skeleton/skin split: a dedicated, independently-versioned package that ships `@layer skeleton` and the `@layer skeleton, skin;` order declaration, plus the token-name contract (the `TokenContract` type + layer-name constants, re-exported so the contract has one home). A breaking structural change bumps *this* package, not a skin.

- **Lumina** now depends on `@refrakt-md/skeleton` and imports it first, so the layer order is declared before any layer content. Lumina's own CSS is currently unlayered (it wins over the empty skeleton layer, so rendered output is unchanged); the per-file `@layer skin` re-bucketing that fills the skeleton layer lands in a follow-up.
- **The SvelteKit loader** emits the `@refrakt-md/skeleton` import before any theme CSS in both dev and build modes — the order-declaration-first guarantee that lets a theme's `@layer skin` win over `@layer skeleton` with ordinary selectors and **no `!important`**, regardless of import order.

**Icon-from-config (SPEC-094 §8).** Embedded `data:image/svg+xml` mask-image glyphs are lifted out of `hint` and `accordion` CSS into the theme icon registry (`config.icons`). The token generator surfaces them as `--rf-icon-<group>-<name>` mask custom properties, and the rune CSS reads those via `var()`. A theme re-glyphs the hint icons / accordion chevron by editing config alone — no CSS change.
