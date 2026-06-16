---
"@refrakt-md/lumina": patch
---

**Fix: structure contracts were missing the plan plugin (and recent chart modifiers).** The committed `structures.json` (both the repo-level copy and Lumina's shipped `./contracts` export) had drifted from the generator — the drift guard regenerated from a `fullConfig` that omitted `@refrakt-md/plan`, so 11 plan runes (`spec`/`work`/`bug`/`decision`/`milestone` + the plan UI runes) and the `chart` `tick-count`/`tick-step`/`label-angle` modifiers were absent from the published contract. The contract now covers all 9 official plugins (131 runes); the drift test includes the plan plugin and additionally guards the repo-level copy so the two committed files can't diverge again.
