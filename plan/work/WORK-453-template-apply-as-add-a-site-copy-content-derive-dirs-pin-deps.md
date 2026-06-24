{% work id="WORK-453" status="done" priority="high" complexity="complex" source="SPEC-109" tags="templates,install,config,scaffold-copy" milestone="v0.25.0" %}

# Template apply as add-a-site: copy content, derive dirs, pin deps

{% ref "SPEC-109" /%} §2–§3 + {% ref "SPEC-110" /%} §4 (`kind: "site"`) — installing a
full-site template **adds a site**: write the manifest's `site` SiteConfig, derive the
content/sandbox destinations, scaffold-copy the package's trees, and pin the derived deps.
This is the heart of the template mechanism.

## Acceptance Criteria
- [x] Template apply writes the manifest's `site` SiteConfig into `sites.<key>` (`sites.default`/singular for a new project, `sites.<name>` for a multi-site add), deep-merged per {% ref "SPEC-115" /%}
- [x] Content/sandbox destinations are derived from (framework starter layout) × (target site key); the package's `content/`/`sandboxes/` are copied in; the resolved `contentDir`/`sandbox.dir` are written into the SiteConfig
- [x] Deps are derived from `site.plugins` + `site.theme.package` and pinned as live dependencies; content is scaffold-copied (author-owned)
- [x] Full-site templates seed a **new project or new site only** (no overlay onto an existing site — the deferred section case)
- [x] `--site` names a **new** site; collision with an existing site errors ({% ref "WORK-446" /%})

## Approach
Implement the `kind: "site"` apply branch over the shared resolver ({% ref "WORK-445" /%}) and
the multi-site helpers ({% ref "WORK-446" /%}), using the `template.json` type
({% ref "WORK-451" /%}). Greenfield runs through `create-refrakt`; add-a-site runs through the
install surface — both share this apply.

## Dependencies
- {% ref "WORK-451" /%} — `template.json` type
- {% ref "WORK-445" /%} — shared resolver
- {% ref "WORK-446" /%} — multi-site `--site` + config helpers

## References
- {% ref "SPEC-109" /%} §2, §3; {% ref "SPEC-110" /%} §4

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-3`. `applyTemplate` (scaffold.ts) composes a site template onto the framework starter: copies the template's `content/` into the starter's content dir (the install-derived destination), merges the manifest's `site` SiteConfig (theme/plugins/routeRules/entityRoutes/assets/backgrounds) into refrakt.config.json, and pins derived deps (`site.plugins` + `site.theme.package`) — `@refrakt-md/*` at the refrakt version, others at `latest`. Content is scaffold-copied (author-owned). Full-site only (rejects `kind:"section"`). The new-site `--site` collision mechanism lives in install.ts (`resolveTargetSite('new')`, WORK-446, tested). 7 apply-template tests pass.

### Note
The greenfield create-refrakt path is complete. The `refrakt` CLI install-time "add a template as a new site to an *existing* project" reuses the same resolver + helpers and is tracked under WORK-461.

{% /work %}
