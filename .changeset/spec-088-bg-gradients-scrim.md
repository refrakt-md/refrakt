---
"@refrakt-md/runes": minor
"@refrakt-md/transform": minor
"@refrakt-md/lumina": minor
---

SPEC-088 bg gradients & scrim. Adds a token-driven `bg` gradient fill (inline
`bg-gradient`/`bg-from`/`bg-to`/`bg-via`/`bg-gradient-type` facets with semantic
token stops, and a structured `BgPresetDefinition.gradient` preset), a structured
`scrim` legibility facet (`gradient`/`frost`, strength/blur/tone — tone also flips
the overlaid foreground), and a constrained flat `overlay` vocabulary
(`dark`/`light`/token + opacity). The raw-string `overlay` passthrough is
deprecated (warns) now that `scrim` ships, the `style` escape hatch is documented
with a stated contract (valid in theme & project config; project merges over
theme), and a build-time soft-lint flags raw gradients that the structured facet
covers. `bg.css` is force-included since `bg` is now a universal-attribute feature.
