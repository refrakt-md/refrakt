---
"@refrakt-md/content": minor
---

Add a published frontmatter schema (WORK-545)

`packages/content/frontmatter.schema.json` describes the frontmatter fields refrakt consumes, served at `https://refrakt.md/frontmatter.schema.json` and the versioned `https://refrakt.md/schemas/vX.Y/frontmatter.schema.json`, alongside the config and theme-token schemas. Pointing an editor's YAML support at it gives hover documentation and completion inside `---` blocks, which nothing provided before.

Writing it surfaced four fields that were read through the `Frontmatter` index signature rather than declared — `type`, `id`, `created` and `modified`. All four are now declared and documented. `type` is the most consequential: it drives the entity registry, and an author could not learn it existed from the page that claims to list frontmatter fields.

The index signature stays, and the schema does not set `additionalProperties: false`. Runes and pipeline hooks read arbitrary author fields; the schema describes what refrakt consumes rather than closing the set.

A drift test guards the schema against the interface in both directions, the same shape `config-schema.test.ts` uses for the config schema.
