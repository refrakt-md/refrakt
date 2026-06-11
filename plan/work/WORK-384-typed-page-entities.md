{% work id="WORK-384" status="ready" priority="medium" complexity="moderate" source="SPEC-092" milestone="v0.21.0" tags="registry,pipeline,frontmatter,config" %}

# Typed page entities

SPEC-092 Layers 2 + 3 — let a page declare a registry **type** so `collection`/
`aggregate` can query it by domain (`collection type="rune"`), not just `type:page`.

## Decisions (locked)
- A page with frontmatter `type` (and optional `id`) registers as that entity type
  **in addition to** its `page` registration; `id` defaults to the page URL.
  Duplicate `(type, id)` at site scope warns (as page/heading already do).
- **No parallel config block.** The url-pattern → type rule reuses **`routeRules`**:
  add an optional `entity` field (it already maps a pattern → `{layout}`; now
  `{layout, entity}`). Frontmatter `type` overrides the rule. This deliberately
  avoids confusion with the inverse `entityRoutes` (entity → page, SPEC-069).

## Acceptance Criteria
- [ ] Frontmatter `type` (+ optional `id`) registers a typed entity alongside `page`, with the reserved-filtered frontmatter as `data`; explicit `id` honoured, else URL.
- [ ] `routeRules` accepts an optional `entity` field mapping a url pattern → type; frontmatter `type` overrides; unmatched pages stay `page`-only.
- [ ] Duplicate `(type, id)` warns; `getById`/`getAll`/`collection` resolve typed entities.
- [ ] Tests cover frontmatter-declared, config-declared, override, and collision cases.

## Dependencies
- {% ref "WORK-383" /%} (frontmatter indexing — the typed entity reuses the same reserved-filtered data).

## References
- {% ref "SPEC-092" /%} · `packages/types/src/theme.ts` (routeRules) · `packages/content/src/entity-routes.ts` (the inverse, for contrast)

{% /work %}
