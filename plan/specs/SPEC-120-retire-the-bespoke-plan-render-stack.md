{% spec id="SPEC-120" status="accepted" tags="plan, cli, deprecation, cleanup" %}

# Retire the bespoke plan render stack

Remove the `plan build` / `plan serve` commands and the private static-site generator behind them. This is the deferred removal phase that {% ref "SPEC-071" /%} anticipated but deliberately scoped out of its own (now shipped) deliverable: SPEC-071 rebuilt the plan site as an ordinary refrakt site (`entityRoutes` + `collection`, scaffolded by `create-refrakt --type plan`) and *deprecated* the bespoke commands in v0.16.0, but kept them alive so existing users weren't broken. With the site approach proven and shipped, the parallel render stack can now go.

## Problem

The plan plugin still ships a miniature SSG that predates the cross-page pipeline: `plan build` and `plan serve` call a private `runPipeline()` that bypasses `loadContent`, builds its own three-family router (entity / per-status / grouped pages), wraps output in a private `planLayout` shell, runs its own pagefind index, and — for `serve` — stands up an HTTP server on port 3000 with a file watcher and SSE live-reload. Everything it does by hand is now a first-class framework capability ({% ref "SPEC-069" /%} routes, {% ref "SPEC-070" /%} collections, the standard adapter dev server and asset pipeline). Keeping it means maintaining two SSGs.

{% ref "WORK-273" /%} shipped the deprecation notices (v0.16.0). This spec covers the removal those notices promised.

## Scope

- Remove the `plan build` and `plan serve` commands from the plan CLI (registration + `--help`).
- Delete the bespoke render stack: the command modules, `render-pipeline.ts` (three-family router + `resolveThemeCss`), `bundle-behaviors.ts`, the private HTTP dev server + file watcher + SSE reload, the `planLayout` shell, and the pagefind invocation.
- Drop now-orphaned dependencies (e.g. pagefind) from `plugins/plan/package.json`.
- Move the docs fully to the site approach and record the removal as a breaking change (changeset).

## Non-Goals

- **The authoring / management CLI stays.** `create` / `next` / `update` / `validate` / `status` / `migrate` / `next-id` / `history` / `init` are unaffected — only rendering is retired.
- **The plan runes and pipeline hooks stay.** The `register` / `aggregate` hooks and entity registration feed `entityRoutes` / `collection`; they are retained intact.
- **No changes to the plan site scaffold itself** — that shipped under SPEC-071.

## Acceptance Criteria

- [ ] `plan build` / `plan serve` are gone from the CLI; invoking them yields an unknown-command error
- [ ] The bespoke render stack (commands, `render-pipeline.ts`, `bundle-behaviors.ts`, private dev server, `planLayout`, pagefind) is deleted
- [ ] Orphaned dependencies are removed from `plugins/plan/package.json`
- [ ] The authoring CLI, plan runes, and register/aggregate hooks are unchanged and green
- [ ] Docs no longer present `plan build` / `plan serve` as the way to view plan content and point at the site approach
- [ ] A changeset records the removal as a breaking change to `@refrakt-md/plan`
- [ ] `npm run build` and `npm test` pass

## References

- {% ref "SPEC-071" /%} — plan site scaffolding (shipped); § *Deprecation of plan build / plan serve* step 3 anticipated this removal and scoped it out
- {% ref "WORK-273" /%} — the deprecation phase (v0.16.0) that deferred removal to a later release
- {% ref "SPEC-069" /%} — `entityRoutes` / contributed routes, the per-entity render replacement
- {% ref "SPEC-070" /%} — `collection` rune, the dashboards / listings replacement

{% /spec %}
