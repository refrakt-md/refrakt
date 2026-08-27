{% work id="WORK-516" status="done" priority="medium" complexity="moderate" source="SPEC-120" tags="plan, cli, deprecation, cleanup" milestone="v0.30.0" pr="refrakt-md/refrakt#574" %}

# Remove bespoke plan build/serve render stack

Realize {% ref "SPEC-120" /%}: remove the `plan build` / `plan serve` commands and the private static-site generator behind them, now that a plan site is an ordinary refrakt site (`entityRoutes` + `collection`, scaffolded by `create-refrakt --type plan`). This is the deferred removal phase — {% ref "WORK-273" /%} shipped the deprecation in v0.16.0, and {% ref "SPEC-071" /%} § *Deprecation of plan build / plan serve* (step 3) anticipated but scoped it out. The authoring CLI, plan runes, and register/aggregate hooks are untouched.

## Acceptance Criteria
- [x] `plan build` and `plan serve` are removed from the CLI (command registration + `--help`); invoking them yields an unknown-command error, not the deprecation notice
- [x] The bespoke render stack is deleted: `plugins/plan/src/commands/build.ts`, `serve.ts`, `render-pipeline.ts` (its three-family router + `resolveThemeCss`), `bundle-behaviors.ts`, the private HTTP dev server + file watcher + SSE reload, the `planLayout` shell, and the pagefind invocation
- [x] Any now-orphaned dependencies (e.g. pagefind) are dropped from `plugins/plan/package.json`
- [x] The authoring/management CLI is unchanged and still passes: `create` / `next` / `update` / `validate` / `status` / `migrate` / `next-id` / `history` / `init`
- [x] The plan plugin's runes, `register`/`aggregate` pipeline hooks (`pipeline.ts`), and entity registration are retained intact
- [x] Docs stop presenting `plan build` / `plan serve` as the way to view plan content and point at the site approach (`create-refrakt --type plan` for new projects, the `entityRoutes` config for existing ones): `site/content/plan/docs/plan-site.md`, `plan-cli.md`, `plan-integrate.md`, `site/content/runes/plan/{workflow,cli,index}.md`, `site/content/plan/index.md`, `site/content/docs/mcp/overview.md`
- [x] `CLAUDE.md`'s "Fall back to the CLI … (`refrakt plan serve`, `refrakt plan build`)" note is updated to the site approach
- [x] A changeset is added recording the removal as a breaking change for the plan plugin
- [x] `npm run build` and `npm test` pass with the render stack removed

## Approach

The deprecation notices (`serve.ts` / `build.ts`) already point users at the replacement, so this is mechanical deletion plus doc/config cleanup. Delete the command modules and their private pipeline, unregister the commands from the plan CLI entry point, and drop any deps only they used. Keep everything the standard site pipeline consumes — the register/aggregate hooks feed `entityRoutes`/`collection`, which is what the plan site now renders through.

Grep for stragglers before finishing: `plan serve`, `plan build`, `render-pipeline`, `planLayout`, `runPipeline` (the plan-plugin one, distinct from `@refrakt-md/content`'s), and `pagefind` across `plugins/plan/`, `site/content/`, and `CLAUDE.md`. This is a breaking change to `@refrakt-md/plan`, hence the changeset.

## Blocked by
- {% ref "WORK-273" /%}

## References

- {% ref "SPEC-120" /%} — retire the bespoke plan render stack (the spec this work item realizes)
- {% ref "SPEC-071" /%} — plan site scaffolding (shipped); § *Deprecation of plan build / plan serve* step 3 anticipated this removal
- {% ref "WORK-273" /%} — the deprecation phase that deferred removal to a later release
- {% ref "SPEC-069" /%} — `entityRoutes` / contributed routes, the replacement for per-entity render
- {% ref "SPEC-070" /%} — `collection` rune, the replacement for the dashboards and per-status listings

## Resolution

Completed: 2026-07-24

Branch: `claude/v0-30-milestone-review-hg592h`

### What was done
- Removed `plan build`/`plan serve` and the private render stack (render-pipeline.ts, build.ts, serve.ts, bundle-behaviors.ts, plan-behaviors.ts).
- Dropped orphaned deps: @refrakt-md/html, @refrakt-md/highlight, @refrakt-md/behaviors, reflect-metadata, esbuild, pagefind.
- Retained the plan runes, register/aggregate hooks + entity registration, and the whole authoring CLI.
- Docs moved fully to the site approach (create-refrakt --type plan / entityRoutes); changeset records the breaking change.

### Notes
- The theme.orderings display order the standard site needs already lived in enums.ts; the vocabulary exhaustiveness test now checks those live orderings. `npm run build` and `npm test` (317 files / 3736 tests) green.

{% /work %}
