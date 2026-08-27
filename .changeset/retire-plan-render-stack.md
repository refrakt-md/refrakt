---
"@refrakt-md/plan": minor
---

Remove the bespoke `plan build` / `plan serve` render stack (SPEC-120).

**Breaking:** the `refrakt plan build` and `refrakt plan serve` commands are
gone, along with their private static-site generator (the three-family
render-pipeline router, `planLayout` shell, the port-3000 dev server + file
watcher + SSE reload, the behavior bundler, and the pagefind invocation).
Invoking either command now yields an unknown-command error.

A plan directory is an ordinary refrakt site since SPEC-071: scaffold a
deployable plan site with `create-refrakt --type plan` (or `refrakt plan init
--target <adapter>`) and use the standard adapter dev server / `npm run build`,
or wire `entityRoutes` + `collection` into an existing refrakt site. The plan
runes, the `register`/`aggregate` pipeline hooks, and the entire authoring CLI
(`create` / `next` / `update` / `validate` / `status` / `migrate` / `next-id` /
`history` / `init`) are unchanged.

Also drops the now-orphaned `@refrakt-md/html`, `@refrakt-md/highlight`,
`@refrakt-md/behaviors`, `reflect-metadata`, `esbuild`, and `pagefind`
dependencies from `@refrakt-md/plan`.
