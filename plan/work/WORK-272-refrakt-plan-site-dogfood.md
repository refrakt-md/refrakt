{% work id="WORK-272" status="done" priority="high" complexity="complex" source="SPEC-071" tags="plan, dogfood, content" milestone="v0.16.0" %}

# refrakt plan site dogfood

Wire refrakt's own `plan/` as a `sites.plan` site and author its `plan-site/` content, proving that `entityRoutes` + `collection` replace the bespoke `plan serve`. This is the milestone's proof-of-practice.

## Acceptance Criteria
- [x] Root `refrakt.config.json` declares a `plan` site (its own base path; `contentDir` `plan-site/`; `@refrakt-md/plan`; the `entityRoutes` rules)
- [x] `plan-site/` content dir committed: `_layout.md` + dashboards (progress / activity / ready-work backlog / decisions, by-status, milestones) using existing plan runes + `collection`
- [x] `refrakt build` produces a browsable plan site from refrakt's real `plan/`; entity detail pages render via `{% expand %}`
- [x] Output is feature-comparable to `plan serve` (entity pages, dashboards, listings, search, sidebar nav); gaps documented (notably dev rebuild-on-edit for plan entities)

## Dependencies
- WORK-268 (entityRoutes adapter)
- WORK-270 (plan entity embeddability)
- WORK-271 (plan-site scaffold — shares the config/dashboard shape)
- WORK-263, WORK-264 (collection + table columns)

## References

- {% ref "SPEC-071" /%}

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done

**Config + content**
- `refrakt.config.json`: new `sites.plan` entry declaring `contentDir: ./plan-site/content`, theme `@refrakt-md/lumina`, `baseUrl: https://plan.refrakt.md`, plugins `['@refrakt-md/plan']`, a `docs` layout `routeRules` mapping, and the entityRoutes block from SPEC-071 for spec/work/bug/decision/milestone (URL templates use `{id}` / `{name}`, body is `{% expand $item.id /%}` — and `$item.name` for milestones).
- `plan-site/content/`: committed as a tracked content dir — `_layout.md` (nav region with sidebar links to specs/work/bugs/decisions/milestones), `index.md` (plan-progress + plan-activity + status:ready backlog + decision-log), `work.md` / `specs.md` / `bugs.md` / `decisions.md` / `milestones.md` (grouped/sorted `collection` listings, with `decision-log` on the decisions page).
- `.gitignore`: dropped `plan-site/`, added `.plan-build/`. The bespoke `plan build` default output was relocated to `.plan-build/` (`plugins/plan/src/cli-plugin.ts`) so the deprecated command can't clobber the tracked `plan-site/` content.

**SvelteKit wrapper (so the dogfood actually runs locally)**
- `plan-site/`: parallel SvelteKit project to `site/` — `package.json`, `vite.config.ts` (selects `site: 'plan'` against `../refrakt.config.json`), `svelte.config.js` (adapter-static + `handleHttpError: 'warn'` to tolerate cross-site refs to the docs site's `/plan/*` paths), `tsconfig.json`, `.gitignore`, and `src/{app.html, app.d.ts, hooks.server.ts, lib/{content.ts, index.ts}, routes/{+layout.svelte, +layout.server.ts, [...slug]/{+page.svelte, +page.server.ts}}}`. The catch-all route strips both leading **and** trailing slashes when generating `entries()` (entityRoutes URLs are trailing-slashed; SvelteKit rejects slugs that start or end with `/`), and `load()` tolerates either form on lookup.
- Root `package.json`: `plan-site` added to `workspaces`.
- Verified: `npm run build` from `plan-site/` produces **367 prerendered HTML pages** — every dashboard plus a detail page per real spec/work/bug/decision/milestone in `plan/`. WORK-272.html contains the work item body; `index.html` renders with `rf-plan-progress`, `rf-plan-activity`, `rf-backlog`, `rf-decision-log` BEM classes wired up.

**Pipeline fix that made the wrapper actually work**
- `packages/content/src/loader.ts`, `site.ts`, `refract-loader.ts`: threaded `siteConfig` through `createSiteLoader` / `createVirtualSiteLoader` / `loadContentFromTree` / `createRefraktLoader` / `createVirtualRefraktLoader`. Previously the runtime loader (used by the SvelteKit virtual module) didn't pass `siteConfig` to `loadContent`, so the built-in entityRoutes adapter saw no rules and contributed zero pages at runtime — entityRoutes only worked when callers wired `loadContent` themselves (the integration test). With the threading fix, every adapter that uses `createRefraktLoader` gets entityRoutes for free.
- `packages/content/src/entity-routes.ts`: spread the registration's `data` payload onto the `$item` variables in `project()` so `{% expand $item.<field> /%}` resolves any field surfaced via URL `{name}` substitution. This is what makes the SPEC-071 milestone rule (`render: '{% expand $item.name /%}'`) work as documented — milestones key off `name`, which lives in `data.name`.

**Tests**
- `packages/content/test/plan-site-dogfood-real.test.ts`: new integration test that reads refrakt's actual `refrakt.config.json` + `plan/` + `plan-site/content/` and asserts: (a) the config declares entityRoutes for all five plan entity types with `{% expand %}` bodies, (b) `loadContent` produces detail pages for every spec/work entity (sample: SPEC-071, WORK-272, plus an aggregate count threshold), (c) the expanded entity body is inlined on its detail page (`source.type === 'contributed'` + body text match), (d) authored dashboard URLs are present, (e) no error-severity warnings from contribute/aggregate/postProcess.
- `packages/content/test/plan-site-dogfood.test.ts`: drive-by — `realpathSync(tmpdir())` so the synthetic test passes on macOS where `/tmp` is a symlink to `/private/tmp` (the snippet sandbox rejects symlink-escapes).
- All 165 `packages/content` tests pass after the loader threading change.

### Notes
- **Run it locally:** `cd plan-site && npm run dev` (uses port 5176 if 5173-5175 are taken — `site/`'s dev server). `npm run build` produces a fully static prerendered site under `plan-site/build/`.
- The wrapper's `+page.server.ts` is the canonical reference for adapter projects that consume entityRoutes — leading/trailing-slash handling, lookup tolerance, `handleHttpError: 'warn'` for cross-site refs. The same pattern is now in the create-refrakt template ([packages/create-refrakt/template/src/routes/[...slug]/+page.server.ts](packages/create-refrakt/template/src/routes/%5B...slug%5D/+page.server.ts)) so all scaffolded projects inherit it.
- "Output feature-comparable to `plan serve`" — confirmed via the production build: entity detail pages render the expanded entity body, dashboards compose, sidebar nav works, search inherits the standard site behavior (SPEC-069 guarantee). Documented gap: dev-server HMR on plan entity edits still requires a full rebuild (resolved decision in SPEC-071 — accepted v1 gap).
- `entity-routes.ts` `project()` change is a generalization, not a hack for milestones: any plan entity field becomes available to `$item.<field>` in render templates, mirroring URL `{name}` semantics.
- The siteConfig-threading omission was a real product bug, not a test-only artifact — any external adapter using `createRefraktLoader` (which is the documented runtime entry point) would have seen the same silent no-op. Fixed for all consumers.
- Pre-existing failures in `packages/runes/test/expand-pipeline.test.ts` and `snippet-pipeline.test.ts` are unrelated to this work (reproduced on main with my changes stashed).

{% /work %}
