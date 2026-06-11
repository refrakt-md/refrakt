---
"@refrakt-md/content": minor
---

Pages can now register as **typed registry entities** (SPEC-092 Layers 2 & 3). A page that sets a frontmatter `type` (and optional `id`) is registered as that entity type in addition to its `page` entity, reusing the page's reserved-filtered data; `id` defaults to the page URL. A new `routeRules` `entity` field types a whole section by convention (e.g. `{ "pattern": "runes/**", "entity": "rune" }`) without per-page frontmatter — a page's own `type` overrides the rule. Duplicate `(type, id)` registrations warn. This lets `collection`/`aggregate` query content by domain type (e.g. `collection type="rune"`), and it's the complement of `entityRoutes` (entity → page). Works across all adapters.
