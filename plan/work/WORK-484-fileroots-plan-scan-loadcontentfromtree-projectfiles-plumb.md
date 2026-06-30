{% work id="WORK-484" status="done" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,pipeline,hosted,plan" %}

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

- [x] `fileRoots` scanning and the plan plugin's configure scan read through the provider.
- [x] `loadContentFromTree` accepts `projectFiles` and `gitTimestamps`; a full in-memory-map build (no fs) is covered by an integration test — pages, partials, layouts, a `src`-directory sandbox, and a snippet all resolve.
- [x] `loadContent` (fs mode) is unchanged for well-formed projects (existing suites green); the only behavioural change is containment on previously-unguarded paths.

## Dependencies

- {% ref "WORK-481" /%}, {% ref "WORK-482" /%}, {% ref "WORK-483" /%} — providers + the migrated consumers the integration test exercises.

## References

- {% ref "SPEC-113" /%} §3–4 — `packages/content/src/{file-roots,site}.ts`, the plan plugin configure hook, `loadContentFromTree`/`processContentTree`.

## Resolution

Completed: 2026-06-30

Branch: `claude/milestone-v0-27-0-yqiu8v`

### What was done
- **`loadContentFromTree` plumb** (`content/src/site.ts`): `LoadContentFromTreeOptions` gains `projectFiles`, `gitTimestamps`, and `sandboxExamplesDir`; threaded to `processContentTree` as `sandbox` / `gitTimestamps` / `sandboxExamplesDir`. With a `memoryProjectFiles(map)` a host now gets a fully fs-free build (snippet, sandbox `src`, fileRoots all resolve through the one provider; `embedConfig.projectFiles` is already wired from WORK-483).
- **`ContentTree.fromContentMap(files, { contentDir })`** (`content/src/content-tree.ts`): the "assemble the tree from the map" step SPEC-113 §4 describes — key-prefix filtering builds the page corpus (`_layout.md` → layout, `_partials/…` → partials, other `.md` → pages), no fs. Added an optional `partials` constructor arg + a `sortDirectory` helper mirroring `readDirectory`'s ordering.
- **`fileRoots` through the provider** (`content/src/file-roots.ts`): `readFileRoots(roots, { projectFiles, projectRoot })` scans an in-project root through the provider (recursive `list`/`read`, mirroring the fs key shape); roots outside the project root (plugin partials in node_modules) fall back to `fs`. Wired from `site.ts`.
- **Plan plugin scan through the provider** (`plugins/plan/src/pipeline.ts`): `PluginConfigureOptions` gains `projectFiles`; the configure hook stores it; `performUnconditionalScan` reads `plan.dir` through the provider when set (extracted a shared `processPlanFile` + a `scanViaProvider` walk), else `fs`. `refract-loader.ts` passes `fsProjectFiles(configDir)` to configure.
- **Tests**: new `content/test/in-memory-build.test.ts` — a full site builds from a pure `Map` with zero fs (pages, nested page, layout, local + namespaced-fileRoots partials, a `src`-directory sandbox, and a snippet all resolve). New `readFileRoots`-via-provider cases in `file-roots.test.ts` and a provider-scan case in plan's `unconditional-scan.test.ts`.

### Notes
- Every migration keeps an `fs` fallback, so the self-hosted path is byte-identical: the dogfood/site tests (which drive `configure` without a provider) take the `fs` branch unchanged. The provider path is exercised by the new fs-free tests.
- The provider walk distinguishes files from directories by `read(key) !== null` (a file yields content, a directory yields null), so recursion needs no stat surface.
- Full monorepo builds green; `content` + `runes` + `types` + `plan` suites pass (1521 + the new provider-scan case).

{% /work %}
