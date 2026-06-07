---
"@refrakt-md/marketing": minor
"@refrakt-md/lumina": minor
---

Add a `row-height` attribute to the `bento` rune (`sm` | `md` | `lg` | `xl`) for
control over the uniform grid row-track height in grid mode (8 / 12 / 16 / 20rem;
`md` matches the previous default). Falls back to the theme's
`--rf-bento-row-height` when unset, and is overridden by the stack's auto rows on
mobile.
