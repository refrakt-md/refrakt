{% work id="WORK-272" status="pending" priority="high" complexity="complex" source="SPEC-071" tags="plan, dogfood, content" milestone="v0.16.0" %}

# refrakt plan site dogfood

Wire refrakt's own `plan/` as a `sites.plan` site and author its `plan-site/` content, proving that `entityRoutes` + `collection` replace the bespoke `plan serve`. This is the milestone's proof-of-practice.

## Acceptance Criteria
- [ ] Root `refrakt.config.json` declares a `plan` site (its own base path; `contentDir` `plan-site/`; `@refrakt-md/plan`; the `entityRoutes` rules)
- [ ] `plan-site/` content dir committed: `_layout.md` + dashboards (progress / activity / ready-work backlog / decisions, by-status, milestones) using existing plan runes + `collection`
- [ ] `refrakt build` produces a browsable plan site from refrakt's real `plan/`; entity detail pages render via `{% expand %}`
- [ ] Output is feature-comparable to `plan serve` (entity pages, dashboards, listings, search, sidebar nav); gaps documented (notably dev rebuild-on-edit for plan entities)

## Dependencies
- WORK-268 (entityRoutes adapter)
- WORK-270 (plan entity embeddability)
- WORK-271 (plan-site scaffold — shares the config/dashboard shape)
- WORK-263, WORK-264 (collection + table columns)

## References

- {% ref "SPEC-071" /%}

{% /work %}
