---
'@refrakt-md/marketing': minor
'@refrakt-md/skeleton': minor
'@refrakt-md/lumina': minor
---

`testimonial` can be built as a composition over `section` (SPEC-161 D1). The plugin rune is unchanged; replacing it is a later step.

- **New command:** `refrakt marketing migrate-testimonial [paths…] [--apply]` rewrites a testimonial's `**Name** — Role` paragraph into `author` and `role` attributes, the form the composed rune takes. It reads the paragraph with the plugin's own parser, now exported as `parseAttribution`. It is a dry run by default. The marketing plugin gains a `./cli-plugin` export.
- **A beside split whose media zone is a portrait** takes the portrait's width rather than half the row, unless `media-ratio` is set.
- **The lead value of a `lead` block** is emphasised by weight only, upright even when it is a `<cite>`.
