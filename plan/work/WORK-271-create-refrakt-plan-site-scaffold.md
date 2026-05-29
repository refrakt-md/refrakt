{% work id="WORK-271" status="done" priority="medium" complexity="moderate" source="SPEC-071" tags="plan, create-refrakt, scaffolding" milestone="v0.16.0" %}

# create-refrakt plan-site scaffold

Add a `plan` project type to `create-refrakt` that scaffolds a complete, runnable plan site: config (plugin + `entityRoutes`), a seed `plan/`, and a `plan-site/` content dir (layout + dashboards), for a chosen adapter target.

## Acceptance Criteria
- [x] `create-refrakt --type plan [--target <adapter>]` scaffolds a runnable plan site
- [x] Generated `refrakt.config.json` includes `@refrakt-md/plan` plus the `entityRoutes` rules for spec/work/bug/decision/milestone
- [x] Seed `plan/` (example spec + work + decision + milestone) so `refrakt dev` shows a populated site immediately
- [x] `plan-site/` content dir ships `_layout.md` (docs layout + plan sidebar) and dashboard pages (index, by-status, milestones) using `collection` / `backlog` / `plan-progress`
- [x] Dependency versions derived from create-refrakt's own `package.json` at runtime, as other templates do

## Dependencies
- WORK-268 (entityRoutes adapter)
- WORK-263 (collection rune)

## References

- {% ref "SPEC-071" /%}

## Resolution

Completed: 2026-05-26

Branch: `claude/v0.16.0`

### What was done
- `packages/create-refrakt/src/bin.ts`: `--target` is now accepted with `--type plan` (no longer rejected). When supplied, it dispatches to the new `scaffoldPlanSite()`; without a target the existing planning-only `scaffoldPlan()` stays untouched for back-compat. Help text + success copy updated for the new combination.
- `packages/create-refrakt/src/scaffold.ts`: new `scaffoldPlanSite({ projectName, targetDir, target })` that (1) lays down the adapter shell via the existing `scaffold()` for the chosen target, (2) overwrites `refrakt.config.json` with the plan-site shape — `contentDir: ./plan-site`, `plugins: ['@refrakt-md/plan']`, `routeRules` → `docs` layout, and the entityRoutes block for spec/work/bug/decision/milestone, (3) merges `@refrakt-md/plan` + `@refrakt-md/cli` into `package.json` plus `plan:*` scripts, (4) seeds `plan/` via `runInit({ noPackageJson: true })`, (5) writes `plan-site/_layout.md` + dashboard pages (`index`, `work`, `specs`, `bugs`, `decisions`, `milestones`). Versions are pinned to create-refrakt's own `package.json` via the existing `getRefraktVersion()` helper.
- `packages/create-refrakt/test/scaffold-plan-site.test.ts`: new suite covering the runnable plan-site scaffold — file presence, config shape (contentDir, plugins, entityRoutes types, expand templates), package.json deps + scripts, version pinning, layout content, dashboard rune wiring, and the already-exists guard.
- `packages/create-refrakt/test/bin.test.ts`: dropped the "rejects --type plan with --target" assertion (the combination is now valid) and added a help-text assertion for the new example.
- Stale `packages/create-refrakt/test/x/` (leftover template output) cleaned up.

### Notes
- `--type plan` without `--target` is unchanged: still planning-only (CLI + plan deps, no adapter, no plan-site/). This keeps the bracket-syntax in SPEC-071's acceptance criterion meaningful — supplying `--target` is what turns it into the runnable plan site.
- The dashboard set mirrors WORK-272's hand-authored set for refrakt itself, so the scaffold output and the dogfood site stay in sync.
- All 70 create-refrakt tests pass after the changes.

{% /work %}
