---
"@refrakt-md/transform": patch
---

Fix `validateThemeTokensConfig` rejecting valid tokens because its internal `TOKEN_CONTRACT_SHAPE` had drifted from the `TokenContract` type. The validator was missing the SPEC-056 extended syntax roles (`type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`), the spacing densification band (`spacing.snug`, `spacing.cozy`), and `shadow.none`. As a result, an integrated preset like Nord — which sets the extended syntax roles when it's the *active* preset — failed validation with "unknown token key" errors, even though those keys are part of the contract (scoped Nord *tints* took a different code path and were unaffected). The validator shape now mirrors `SyntaxTokens` and the rest of `TokenContract`.
