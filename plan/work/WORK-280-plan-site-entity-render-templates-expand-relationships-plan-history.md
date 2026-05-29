{% work id="WORK-280" status="done" priority="high" complexity="moderate" source="ADR-011" tags="plan,plan-site,entity-routes,relationships" milestone="v0.16.0" %}

# Plan-site entity render templates: expand + relationships + plan-history

Compose each plan entity's detail page at the **entityRoutes template** level (authored once per type), pulling in the entity's own content plus the supplementary panels — instead of the plugin injecting them. This is the ADR-011 "compose at the template, not via injection" move, and it's what makes the new `relationships` rune (WORK-278) and `plan-history` actually appear on entity pages.

## Acceptance Criteria
- [x] The plan-site `entityRoutes` rules for work/bug/spec/decision use a `render-template` that composes: `{% expand $item.id /%}`, then `## Relationships` `{% relationships of=$item.id /%}`, then `## History` `{% plan-history id=$item.id /%}`.
- [x] The `##` headings are real markdown so `toc` indexes them ("skip to Relationships / History" works).
- [x] Render templates live as partials under the plan-site (per type), not inline per entity; entity content files stay pure.
- [x] Relationships render real edges (depends on WORK-279's edge contribution) and history renders the lifecycle timeline.
- [x] The plan-site builds and the work/spec/etc. detail pages show body + relationships + history with working TOC anchors.

## Approach
Add `render-template` partials to the plan-site (`plan-site/content/_partials/entity/*.md` or similar) and point each `entityRoutes` rule at them. Pass the page entity explicitly via `$item.id` (entityRoutes binds the page entity to `$item` — entity-routes.ts:97). No `$entity` binding is needed.

## Dependencies
WORK-278 (relationships rune), WORK-279 (plan edge contribution so relationships resolve).

## References
- {% ref "ADR-011" /%} — template-level composition; the concrete work render string.
- {% ref "SPEC-069" /%} — entityRoutes render-template mechanism.

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `plan-site/content/_partials/entity/{work,bug,spec,decision}.md`: new per-type render templates. Each composes `{% expand $item.id level=1 /%}`, then `## Relationships` + `{% relationships of=$item.id /%}`, then `## History` + `{% plan-history id=$item.id /%}`. `level=1` keeps the expanded body's headings in the host outline so the on-this-page TOC indexes them.
- `refrakt.config.json`: switched the four detail routes from inline `render` to `render-template` pointing at the partials above (`entity/spec.md`, `entity/work.md`, `entity/bug.md`, `entity/decision.md`). Milestone keeps inline `render` for now; WORK-281 will add its own template with the collection + progress rollup.
- `plugins/plan/src/pipeline.ts`: `performUnconditionalScan` now also populates `_idReferences` / `_sourceReferences` / `_scannerDependencies` per scanned entity. Previously these were only written from the page-walk (file-backed plan entities) and from the bespoke `plan build` path's `setScannerDependencies`. With the dogfood's plan entities living outside the content dir, no path wrote to those maps and `buildRelationships` produced 0 edges; `registry.relate()` had nothing to contribute and the new `relationships` rune always rendered empty. The map writes run **before** the registry early-return so the cross-page pipeline's second `register()` pass (after `contributePages`, which also clears the maps) repopulates correctly. `_scannerDependencies` is intentionally not cleared in `register` since the bespoke render-pipeline path still seeds it externally before the hook fires.
- `packages/content/test/plan-site-dogfood-real.test.ts`: updated the entityRoutes-shape assertion to accept either `render` (inline) or `render-template` referencing an `entity/*.md` partial.

### Verification
- `plan-site` build: 0 errors / 0 warnings; 367 prerendered pages.
- WORK-272 detail page: TOC indexes both the body's headings (Acceptance Criteria / Dependencies / References / Resolution / What was done / Notes) **and** the template's `## Relationships` and `## History`.
- WORK-272 relationships section renders `implements: SPEC-071`; SPEC-071 reverse page shows 4 `implemented-by` work items plus the `related` edges from its `{% ref %}` body. History sections render the git timeline where present, or the "No history available" placeholder.
- 592/592 plan + content tests pass; 17 targeted relationships/decision-log/ordering tests pass.

### Notes
- Plain-text dependency lists (`- WORK-268 (...)`) inside `## Dependencies` sections are still not captured as edges — `scanner-core`'s `extractScopedRefs` only picks up `{% ref %}` tags. Structured edges (`source=...` attribute → implements/informs, `{% ref %}` in body → related) flow through. Promoting plain-text deps to `{% ref %}` would close the last gap; out of scope here.
- WORK-279's "remove the private relationship map from the rendering path" criterion still hinges on WORK-282 (which deletes the plan plugin's `postProcess` injection that reads from the map). Today the local map and the registry graph carry the same edges; once WORK-282 deletes the consumer, the local map can go too.

{% /work %}
