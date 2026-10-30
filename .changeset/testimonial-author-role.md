---
'@refrakt-md/marketing': minor
---

`testimonial` accepts `author` and `role` attributes for its byline. When either is set, the `**Name** — Role` paragraph is not read. When neither is set, the paragraph is parsed as before. The rendered byline and the `Review` / `Person` JSON-LD are the same either way. `refrakt marketing migrate-testimonial <paths> --apply` rewrites the paragraph into the attributes, and the snippet now uses the attribute form (SPEC-181 D7).
