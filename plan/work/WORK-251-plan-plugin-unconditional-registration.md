{% work id="WORK-251" status="ready" priority="high" complexity="moderate" source="SPEC-064" tags="plan, plugins, registry, pipeline" milestone="v0.15.0" %}

# Plan plugin: unconditional scan, entity registration, `fileRoots` opt-in

Extend the plan plugin so every plan entity in the configured `plan.dir` is registered into the `EntityRegistry`, regardless of whether plan files are part of any site's content tree. Each registration includes `sourceFile` and an extractor function so both xref and expand can operate uniformly. The plan plugin also opts into WORK-250's file-roots mechanism by declaring `plan:` as its namespace.

Without this, refrakt's own docs site (where plan content lives at the project root, not inside any site's content tree) and most user setups have empty plan-entity registries, breaking expand and degrading xref to pattern-only resolution.

## Acceptance Criteria

### Unconditional scan

- [ ] Plan plugin's `register` hook performs an unconditional scan of `plan.dir` after processing site-loaded pages
- [ ] All plan entities (spec, work, bug, decision, milestone) found in `plan.dir` are registered into the `EntityRegistry`
- [ ] Registrations include `sourceFile` (project-root-relative path) and `extract` (function returning the top-level plan rune AST or null)
- [ ] Registrations include the standard `data` fields (title, status, tags, source, created, modified)
- [ ] When a plan file is both in `plan.dir` and part of a site's content tree, the site-load registration wins (with real `sourceUrl`); the unconditional scan skips to avoid duplicate registration
- [ ] When `plan.dir` doesn't exist or is empty, the scan is a silent no-op (no error)
- [ ] Duplicate IDs across different plan files fail content load with both file paths named

### Filename convention as hint, not filter

- [ ] Files in `plan.dir` whose filenames don't match the auto-ID or milestone-semver convention are still parsed; if a valid top-level plan rune (with `id=`) is present, the entity is registered
- [ ] Files in `plan.dir` that contain no parseable top-level plan rune are skipped with a debug-level warning

### File-roots opt-in

- [ ] Plan plugin declares `fileRoots: { plan: "../../plan" }` (path relative to the plugin package directory) so partials and snippet can resolve `plan:filename.md` references

### Downstream

- [ ] xref for plan IDs in non-plan-publishing sites finds the entity in the registry; falls through to {% ref "SPEC-065" /%} patterns when `sourceUrl` is undefined
- [ ] expand ({% ref "SPEC-066" /%}) for plan IDs in non-plan-publishing sites finds the entity in the registry and substitutes its content
- [ ] Existing register-hook tests for site-loaded plan content continue to pass; new tests cover unconditional scan, duplicate detection across paths, missing-directory silence

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

{% /work %}
