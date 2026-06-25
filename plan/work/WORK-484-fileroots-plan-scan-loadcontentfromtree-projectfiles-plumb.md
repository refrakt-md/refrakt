{% work id="WORK-484" status="ready" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,pipeline,hosted,plan" %}

# `fileRoots` + plan scan + `loadContentFromTree` plumbs; in-memory full-build test

Finish the consumer migration and the virtual entry point: scan `fileRoots` and the plan
plugin's configure scan through the provider, expose `projectFiles` + `gitTimestamps` on
`loadContentFromTree`, and prove a full site builds from a pure in-memory map.

## Scope

- **`fileRoots`** — `packages/content/src/file-roots.ts` scanning reads through the provider instead of direct `fs`.
- **Plan plugin** — the `@refrakt-md/plan` `configure`-time scan accepts a provider from the pipeline context (hosted deployments that don't build plan sites simply don't provide plan content).
- **`loadContentFromTree`** — accepts `projectFiles?: ProjectFiles` and exposes `gitTimestamps` (`processContentTree` already accepts the map; this is the missing one-line plumb). `loadContent` (fs mode) constructs `fsProjectFiles(projectRoot)` and threads it.
- **Integration test** — a full site build from a pure in-memory `Map` (no fs access): pages, partials, layouts, a `src`-directory sandbox, and a snippet all resolve.

## Acceptance Criteria

- [ ] `fileRoots` scanning and the plan plugin's configure scan read through the provider.
- [ ] `loadContentFromTree` accepts `projectFiles` and `gitTimestamps`; a full in-memory-map build (no fs) is covered by an integration test — pages, partials, layouts, a `src`-directory sandbox, and a snippet all resolve.
- [ ] `loadContent` (fs mode) is unchanged for well-formed projects (existing suites green); the only behavioural change is containment on previously-unguarded paths.

## Dependencies

- {% ref "WORK-481" /%}, {% ref "WORK-482" /%}, {% ref "WORK-483" /%} — providers + the migrated consumers the integration test exercises.

## References

- {% ref "SPEC-113" /%} §3–4 — `packages/content/src/{file-roots,site}.ts`, the plan plugin configure hook, `loadContentFromTree`/`processContentTree`.

{% /work %}
