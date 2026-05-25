{% work id="WORK-271" status="pending" priority="medium" complexity="moderate" source="SPEC-071" tags="plan, create-refrakt, scaffolding" milestone="v0.16.0" %}

# create-refrakt plan-site scaffold

Add a `plan` project type to `create-refrakt` that scaffolds a complete, runnable plan site: config (plugin + `entityRoutes`), a seed `plan/`, and a `plan-site/` content dir (layout + dashboards), for a chosen adapter target.

## Acceptance Criteria
- [ ] `create-refrakt --type plan [--target <adapter>]` scaffolds a runnable plan site
- [ ] Generated `refrakt.config.json` includes `@refrakt-md/plan` plus the `entityRoutes` rules for spec/work/bug/decision/milestone
- [ ] Seed `plan/` (example spec + work + decision + milestone) so `refrakt dev` shows a populated site immediately
- [ ] `plan-site/` content dir ships `_layout.md` (docs layout + plan sidebar) and dashboard pages (index, by-status, milestones) using `collection` / `backlog` / `plan-progress`
- [ ] Dependency versions derived from create-refrakt's own `package.json` at runtime, as other templates do

## Dependencies
- WORK-268 (entityRoutes adapter)
- WORK-263 (collection rune)

## References

- {% ref "SPEC-071" /%}

{% /work %}
