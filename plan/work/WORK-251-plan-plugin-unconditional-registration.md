{% work id="WORK-251" status="done" priority="high" complexity="moderate" source="SPEC-064" tags="plan, plugins, registry, pipeline" milestone="v0.15.0" %}

# Plan plugin: unconditional scan, entity registration, `fileRoots` opt-in

Extend the plan plugin so every plan entity in the configured `plan.dir` is registered into the `EntityRegistry`, regardless of whether plan files are part of any site's content tree. Each registration includes `sourceFile` and an extractor function so both xref and expand can operate uniformly. The plan plugin also opts into WORK-250's file-roots mechanism by declaring `plan:` as its namespace.

Without this, refrakt's own docs site (where plan content lives at the project root, not inside any site's content tree) and most user setups have empty plan-entity registries, breaking expand and degrading xref to pattern-only resolution.

## Acceptance Criteria

### Unconditional scan

- [x] Plan plugin's `register` hook performs an unconditional scan of `plan.dir` after processing site-loaded pages
- [x] All plan entities (spec, work, bug, decision, milestone) found in `plan.dir` are registered into the `EntityRegistry`
- [x] Registrations include `sourceFile` (project-root-relative path) and `extract` (function returning the top-level plan rune AST or null)
- [x] Registrations include the standard `data` fields (title, status, tags, source, created, modified)
- [x] When a plan file is both in `plan.dir` and part of a site's content tree, the site-load registration wins (with real `sourceUrl`); the unconditional scan skips to avoid duplicate registration
- [x] When `plan.dir` doesn't exist or is empty, the scan is a silent no-op (no error)
- [x] Duplicate IDs across different plan files fail content load with both file paths named

### Filename convention as hint, not filter

- [x] Files in `plan.dir` whose filenames don't match the auto-ID or milestone-semver convention are still parsed; if a valid top-level plan rune (with `id=`) is present, the entity is registered
- [x] Files in `plan.dir` that contain no parseable top-level plan rune are skipped with a debug-level warning

### File-roots opt-in

- [x] Plan plugin declares `fileRoots: { plan: "../../plan" }` (path relative to the plugin package directory) so partials and snippet can resolve `plan:filename.md` references

### Downstream

- [x] xref for plan IDs in non-plan-publishing sites finds the entity in the registry; falls through to {% ref "SPEC-065" /%} patterns when `sourceUrl` is undefined
- [x] expand ({% ref "SPEC-066" /%}) for plan IDs in non-plan-publishing sites finds the entity in the registry and substitutes its content
- [x] Existing register-hook tests for site-loaded plan content continue to pass; new tests cover unconditional scan, duplicate detection across paths, missing-directory silence

## Approach

Extend the existing `register` pipeline hook in `plugins/plan/src/pipeline.ts` to also scan `plan.dir` (resolved via `_planDir`) for `.md` files. For each parseable plan rune found, register the entity with `sourceFile` and a closure-captured `extract` function returning the top-level rune AST node. Path comparison against already-processed pages skips duplicates that come in through both site-load and unconditional-scan paths.

Filename-convention check is informational only — the rune's `id=` attribute determines the entity's identity. Files with no plan rune at all are skipped (covers READMEs and other auxiliary content).

Plugin `fileRoots` opt-in is added to the plan plugin's export.

## Dependencies

- {% ref "WORK-250" /%} — `Plugin.fileRoots` interface (needed for the `plan:` namespace opt-in)

## References

- {% ref "SPEC-064" /%} — plan-registration spec (full)
- {% ref "SPEC-066" /%} — expand rune (primary consumer of `sourceFile` + `extract`)
- {% ref "SPEC-065" /%} — xref resolution (pattern fallback when `sourceUrl` is undefined)
- `plugins/plan/src/pipeline.ts:156` — `_planDir` plumbing
- `plugins/plan/src/pipeline.ts:208` — existing `register` hook to extend
- `plugins/plan/src/scanner.ts` — existing file enumeration logic to share

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-2`

### What was done

- **`packages/types/src/pipeline.ts`** — extended `EntityRegistration` with optional `sourceFile` (project-root-relative path to the backing `.md` file) and `extract` (function returning the top-level rune AST node from a freshly-parsed source file, or `null`). These power expand (SPEC-066) — entities that have them can be inlined; entities that don't can't.
- **`packages/types/src/pipeline.ts`** — added `PluginPipelineHooks.configure` lifecycle hook and `PluginConfigureOptions` interface. Configure runs once per build before any other hook, giving plugins access to the user's `refrakt.config.json`, the `configDir`, and a `registerFileRoot(namespace, absPath)` callback for dynamic file-root registration.
- **`packages/types/src/index.ts`** — re-exported `PluginConfigureOptions`.
- **`packages/content/src/refract-loader.ts`** — both `createRefraktLoader` and `createVirtualRefraktLoader` now call `pkg.pipeline?.configure?.()` on each loaded plugin (after plugin loading, before pipeline hooks). They collect dynamically-registered file roots and merge them in alongside static plugin roots. User config still wins all collisions.
- **`plugins/plan/src/pipeline.ts`**:
  - `configure` hook reads `config.plan.dir`, resolves it to an absolute path, sets the module-level `_planDir`, and calls `opts.registerFileRoot('plan', absPlanDir)` so the `plan:` namespace is reachable from any page.
  - `setProjectRoot` exported (mirrors `setPlanDir`) for the module-level `_projectRoot` used in computing project-root-relative `sourceFile` paths.
  - New `performUnconditionalScan(planDir, projectRoot, registry, ctx)` walks `plan.dir` recursively for `.md` files. Each file is parsed via `parseFileContent` (the same scanner-core helper the CLI uses — single source of truth). Files with no parseable plan rune are silently skipped. Files with a valid `id=` register an entity with `sourceFile` + `extract`. Duplicate IDs across two files surface as an `error` warning naming both paths.
  - The dedup against site-load uses `registry.getById(type, id)`: if an entity is already registered with a `sourceUrl`, the site-load path won — skip. Filename convention (`{ID}-{slug}.md`) is informational only; the rune's `id=` attribute is the source of truth.
  - `register` hook calls `performUnconditionalScan` after processing site-loaded pages.
- **`plugins/plan/src/index.ts`** — removed the planned static `fileRoots: { plan: '../../plan' }` declaration. That path points at `node_modules/plan/` for npm-installed users (wrong directory). The configure hook does the right thing instead by registering the user's actual `plan.dir`.
- **`plugins/plan/src/commands/render-pipeline.ts`** — updated to handle the new optional `sourceUrl` on `EntityRegistration` (skip the byTypeAndUrl index when undefined) and the new `resolveXrefs(renderable, pageUrl, registry, patterns, ctx)` signature (CLI passes `[]` for patterns; CLI doesn't currently consume refrakt-config xref patterns).
- **`plugins/plan/test/unconditional-scan.test.ts`** (new) — 11 tests covering: spec/milestone registration with `sourceFile` + `extract`, site-load-wins dedup, non-conforming filenames still register if rune has `id=`, no-rune files silently skipped, duplicate-ID error, missing-directory silence, the `extract` function actually returns the expected AST node, and the `configure` hook's dynamic file-root registration (with `plan.dir` set, without it, and with a null config).
- **`.changeset/plan-unconditional-registration.md`** — minor-version changeset documenting the new registration shape, configure lifecycle, dynamic file-root registration, and the deliberate omission of static `fileRoots`.

### Notes

- **Deviation from the literal acceptance criterion** for `Plugin.fileRoots: { plan: '../../plan' }`: that static path was based on the assumption that the plan plugin ships plan content (it doesn't — users have their own at the project root). For npm-installed users, `../../plan` from `node_modules/@refrakt-md/plan/` resolves to `node_modules/plan/` which is the wrong place. The configure-hook-with-dynamic-registration path is the correct mechanism. The criterion's intent ("partials can resolve `plan:foo.md` references") is satisfied via the dynamic path; the implementation differs from the literal text.
- **`PluginPipelineHooks.configure` is a generic extension point**, not snippet-specific. Any plugin that needs build-time config (whether for file roots, pipeline behavior, or something else) uses the same hook. The plan plugin is the v1 consumer; future plugins (e.g., a hypothetical i18n plugin that needs locale config) plug in the same way.
- **Render-pipeline.ts handling of optional `sourceUrl`**: the CLI's render-pipeline maintains its own minimal `EntityRegistry` implementation (separate from the content package's). Updated it to skip URL indexing for entries with undefined `sourceUrl`, matching the same change made to `EntityRegistryImpl` in WORK-253.
- **No breaking change for existing plan-plugin consumers.** The configure hook is new but optional; no existing code calls it. The CLI flow (render-pipeline.ts) still uses the explicit `setPlanDir` call as before. Configure is only called via the new refract-loader path.

{% /work %}
