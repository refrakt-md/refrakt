---
"@refrakt-md/transform": patch
---

Close the contract ↔ engine blind spot, and let the modifier facets declare
their own contract sections (SPEC-124, WORK-525).

`refrakt contracts --check` compares the checked-in contract against what the
generator produces *today* — the generator against itself. Nothing has ever
compared the generator against the **engine**, so a change to the engine that
the generator does not mirror produced a confidently wrong contract with CI
green.

`contract-engine-agreement.test.ts` closes that: it transforms runes and
asserts the engine's actual output matches what the contract promised —
declared root selectors, `data-rune`, modifier data attributes and class
patterns, `valueMap`/`mapTarget` routing, defaults, static modifiers, context
modifiers, and the claim implied by absence.

Verified by mutation: with the engine changed to stop emitting BEM modifier
classes, `contracts --check` still reports "up to date (132 runes)" while the
new test fails.

The three config-modifier facets also gained a `describe(config, block)` that
`generateStructureContract` now consumes, replacing the duplicate derivation in
`contracts.ts`. Contract output is byte-identical across all 132 runes.

Internal only: no public API changes.
