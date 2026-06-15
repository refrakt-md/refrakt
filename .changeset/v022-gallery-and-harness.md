---
"@refrakt-md/cli": minor
---

**`refrakt gallery` + an opt-in visual-regression harness** (SPEC-094) — a new `gallery` command renders every rune across its variants (light + dark) plus the four layout fixtures over a synthetic multi-page context to static, deterministic HTML — the safety net (and AI-iteration surface) for theme work. The companion `@refrakt-md/gallery-harness` package (opt-in; the only Playwright/browser dependency in the repo, deliberately kept out of the core CLI and runtime install path) screenshots the gallery's rune-cell clips and layout pages and diffs them against an ephemeral, gitignored baseline — for restyle before/after and inert-refactor (skeleton/skin) proofs.
