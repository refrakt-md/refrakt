---
'@refrakt-md/runes': minor
---

The staged composed `testimonial` places a featured quotation (SPEC-185 D7).

- **The testimonial places `{% pullquote %}`** for its quote. The pull quote reads the `**Name** — Role` paragraph and renders it as its `<figcaption>`, so the testimonial's `fills` and `byline` meta block go. `author` and `role` stay for the attribute form and are passed to the pull quote.
- **`pullquote` takes `author` and `source`**: the attribution written as attributes, which wins over a paragraph. A placed attribution paragraph keeps its slot marker on the `<figcaption>` it becomes.
- **A schema source can name a placed part with a dot.** `attribution.name` is the node named `name` inside the node placed for `attribution`. When two sources map to one entity property, the first that resolves is published. The testimonial's `Review` / `Person` / `Rating` graph is unchanged.
