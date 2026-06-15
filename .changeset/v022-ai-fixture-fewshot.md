---
"@refrakt-md/ai": minor
"@refrakt-md/runes": minor
---

**AI `write` mode draws fixtures as few-shot exemplars** (SPEC-102) — the write-mode prompt's hardcoded "Example structure" stub is replaced by the fixture corpus: fixtures explicitly tagged `role: canonical`/`rich` (with their authoring `notes`) are surfaced as in-context exemplars, so generated content reflects idiomatic, well-formed rune usage. The set grows automatically as the corpus is annotated. Prompt-time retrieval only — no training or fine-tuning pipeline.
