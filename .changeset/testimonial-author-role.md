---
'@refrakt-md/marketing': minor
---

`testimonial` accepts `author` and `role` attributes for its byline, as an alternative to the `**Name** — Role` paragraph. When either is set, the paragraph is not read. When neither is set, the paragraph is parsed as before. The rendered byline and the `Review` / `Person` JSON-LD are the same either way. The paragraph stays the documented form (SPEC-182).
