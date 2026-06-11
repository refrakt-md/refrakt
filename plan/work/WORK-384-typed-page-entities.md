{% work id="WORK-384" status="done" priority="medium" complexity="moderate" source="SPEC-092" milestone="v0.21.0" tags="registry,pipeline,frontmatter,config" %}

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
- [x] Frontmatter `type` (+ optional `id`) registers a typed entity alongside `page`, with the reserved-filtered frontmatter as `data`; explicit `id` honoured, else URL.
- [x] `routeRules` accepts an optional `entity` field mapping a url pattern → type; frontmatter `type` overrides; unmatched pages stay `page`-only.
- [x] Duplicate `(type, id)` warns; `getById`/`getAll`/`collection` resolve typed entities.
- [x] Tests cover frontmatter-declared, config-declared, override, and collision cases.

## Dependencies
- {% ref "WORK-383" /%} (frontmatter indexing — the typed entity reuses the same reserved-filtered data).

## References
- {% ref "SPEC-092" /%} · `packages/types/src/theme.ts` (routeRules) · `packages/content/src/entity-routes.ts` (the inverse, for contrast)

## Resolution

Completed: 2026-06-11

Branch: `claude/work-383-frontmatter-indexing` (alongside WORK-383).

### What was done
- `RouteRule.entity?` (types) + `matchRouteEntity()` (transform/route-rules) — a url-pattern → entity-type matcher reusing the existing glob matcher.
- `packages/content/src/page-entities.ts` — `createPageEntityHooks(siteConfig)`: a content-side register hook (mirrors the entityRoutes adapter) that registers a page as a typed entity when frontmatter sets `type`, or a `routeRules` rule matches (frontmatter wins). It **reuses the `page` entity's reserved-filtered data** (the core hook runs first), so the typed entity inherits the Layer-1 passthrough; `id` defaults to the URL; duplicate `(type, id)` warns. Wired into `site.ts` hookSets → adapter-agnostic.
- `type`/`id` added to the reserved frontmatter set so the entity-declaration keys don't pollute the page entity's content `data`.

### Why a content-side hook (not plumbing routeRules into the core hook)
- Follows the established `entityRoutes` (SPEC-069) precedent: config-driven registry behaviour lives in the content layer where `siteConfig` is already threaded, so both the sveltekit and html adapters get it with **zero adapter changes**.

### Verification
- `packages/content/test/page-entities.test.ts` (5 tests): frontmatter-declared (data reuse + type/id reserved out of data), routeRules-declared (id = URL), frontmatter-overrides-rule, duplicate warns, no-op. WORK-383's test updated implicitly (type/id now reserved).
- tsc clean across types/transform/runes/content; content suite green (174); runes suite green earlier (765).

### Changeset
- `@refrakt-md/content: minor`.

{% /work %}
