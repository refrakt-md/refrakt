---
"@refrakt-md/types": minor
"@refrakt-md/transform": minor
"@refrakt-md/lumina": minor
---

**Tokenized typography** (SPEC-094) — the token contract gains a full type system: a modular type scale, line-heights, font-weights, letter-spacing, and a display family, as typed `--rf-*` tokens. Lumina's ~351 hardcoded `font-size` declarations are refactored onto the tokens with no visual change, and the token CSS is now generated from `tokens.ts` rather than hand-maintained against a coverage test. Typography is the single largest visual differentiator between a product/docs theme and an editorial one, so this makes it themeable by overriding tokens instead of forking rune CSS — the foundation for themes beyond Lumina.
