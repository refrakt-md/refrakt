---
"@refrakt-md/runes": minor
"@refrakt-md/cli": minor
---

**Standardised rune-fixture corpus + CI validation** (SPEC-102) — rune examples now live as annotated Markdown fixtures (`fixtures/*.md`) with validated YAML frontmatter (`role`, `attributes`, `demonstrates`, `notes`) and `<rune>.<scenario>.md` scenarios; `RUNE_EXAMPLES` is generated from them. A CI test parses, schema-validates, and transforms every fixture in the corpus (rejecting unknown keys / wrong types and any parse/transform error), and `refrakt plugins validate` now reports role coverage — e.g. a rune that has fixtures but no `canonical` one. One source of truth for the inspect command, the gallery, docs, and AI few-shot, with an authoring guide for content authors.
