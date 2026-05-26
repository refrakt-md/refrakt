{% work id="WORK-280" status="ready" priority="high" complexity="moderate" source="ADR-011" tags="plan,plan-site,entity-routes,relationships" milestone="v0.16.0" %}

# Plan-site entity render templates: expand + relationships + plan-history

Compose each plan entity's detail page at the **entityRoutes template** level (authored once per type), pulling in the entity's own content plus the supplementary panels — instead of the plugin injecting them. This is the ADR-011 "compose at the template, not via injection" move, and it's what makes the new `relationships` rune (WORK-278) and `plan-history` actually appear on entity pages.

## Acceptance Criteria
- [ ] The plan-site `entityRoutes` rules for work/bug/spec/decision use a `render-template` that composes: `{% expand $item.id /%}`, then `## Relationships` `{% relationships of=$item.id /%}`, then `## History` `{% plan-history id=$item.id /%}`.
- [ ] The `##` headings are real markdown so `toc` indexes them ("skip to Relationships / History" works).
- [ ] Render templates live as partials under the plan-site (per type), not inline per entity; entity content files stay pure.
- [ ] Relationships render real edges (depends on WORK-279's edge contribution) and history renders the lifecycle timeline.
- [ ] The plan-site builds and the work/spec/etc. detail pages show body + relationships + history with working TOC anchors.

## Approach
Add `render-template` partials to the plan-site (`plan-site/content/_partials/entity/*.md` or similar) and point each `entityRoutes` rule at them. Pass the page entity explicitly via `$item.id` (entityRoutes binds the page entity to `$item` — entity-routes.ts:97). No `$entity` binding is needed.

## Dependencies
WORK-278 (relationships rune), WORK-279 (plan edge contribution so relationships resolve).

## References
- {% ref "ADR-011" /%} — template-level composition; the concrete work render string.
- {% ref "SPEC-069" /%} — entityRoutes render-template mechanism.

{% /work %}
