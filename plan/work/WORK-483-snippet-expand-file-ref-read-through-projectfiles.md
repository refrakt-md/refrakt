{% work id="WORK-483" status="done" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,runes,pipeline,snippet" %}

# snippet / expand / file-ref readers delegate I/O to `ProjectFiles`

Close the main gap in {% ref "SPEC-113" /%}: `read-file.ts` (and the snippet/expand/file-ref
pipelines) call `node:fs` directly today, bypassing the injectable seam — so tree mode is not
actually fs-free for snippets. Delegate the I/O to the {% ref "WORK-481" /%} provider, keeping
line-slicing and diagnostics intact.

## Scope

- **`read-file.ts`** — keep `readSnippetFile`/`readWholeSandboxedFile` line-slicing, range parsing, and structured diagnostics; replace the `node:fs` reads (`statSync`/`readFileSync`/`realpathSync`) with `ProjectFiles` calls. The containment logic moves into `fsProjectFiles` ({% ref "WORK-481" /%}), so this module stops re-implementing it.
- **Consumers** — `snippet-pipeline.ts`, `expand-pipeline.ts`, `file-ref-resolve.ts` obtain the provider from the preprocess context rather than importing fs-bound readers.
- **Tests** — the existing snippet/expand sandbox test suites pass against both `fsProjectFiles` and `memoryProjectFiles`.

## Acceptance Criteria

- [x] snippet / expand / file-ref readers delegate I/O to the provider; line-slicing and diagnostics are unchanged.
- [x] Their existing sandbox tests pass against both providers; a snippet resolves in pure `memoryProjectFiles` mode (no fs access).
- [x] `read-file.ts` no longer re-implements path containment (that now lives in `fsProjectFiles`).

## Dependencies

- {% ref "WORK-481" /%} — the provider (incl. promoted containment).

## References

- {% ref "SPEC-113" /%} §3 (snippet/expand/file-ref) — `packages/runes/src/{snippet-pipeline,expand-pipeline,file-ref-resolve}.ts`, `packages/runes/src/lib/read-file.ts`.

## Resolution

Completed: 2026-06-30

Branch: `claude/milestone-v0-27-0-yqiu8v`

### What was done
- `packages/runes/src/lib/read-file.ts` — dropped the `node:fs` import and the `resolveSnippetPath` containment re-implementation (absolute/traversal/symlink checks). `readSnippetFile`/`readWholeSandboxedFile` now take a `files: ProjectFiles` and read through it; a denied or missing read comes back as `null` and becomes one consolidated `SnippetSandboxError` ("cannot be resolved — missing, not a regular file, or outside the project root"). Line-range parsing, slicing, clamp warnings, and the structured-error mechanism are unchanged. `relativePath` now carries the author-supplied project-relative path (the provider validated containment).
- `snippet-pipeline.ts` (preprocess) — reads through `ctx.sandbox` (the `ProjectFiles` already on `PreprocessContext`, populated from the same provider as the transform-time sandbox). Guard switched from `ctx.projectRoot` to `ctx.sandbox` so tree mode without a wired provider no-ops as before.
- `expand-pipeline.ts` (postProcess) — `embedConfig` gains `projectFiles`; `parseSourceFile` reads embedded entities' source through it. Guard message updated to "no file provider configured".
- `file-ref-resolve.ts` + `drawer-pipeline.ts` (hoist) — `HoistBuildContext.projectRoot` → `projectFiles`; `hoistPreviewDrawers` takes the provider; the file-ref preview-drawer body reads through it.
- `config.ts` — `embedConfig` types carry `projectFiles`; `hoistPreviewDrawers` is called with `coreData.embedConfig?.projectFiles`.
- `content/src/site.ts` — sets `embedConfig.projectFiles = opts.sandbox` (the same `fsProjectFiles(projectRoot)` constructed for snippet/sandbox in WORK-482).
- Tests: snippet/expand/file-ref suites now back reads with `fsProjectFiles`; containment-message assertions consolidated to `/cannot be resolved/` (the provider owns the absolute/traversal/symlink distinctions — WORK-481 tests cover them). Added two fs-free cases proving a snippet resolves from a pure `memoryProjectFiles` map and that a root-escaping path is still denied in memory mode.

### Notes
- This closes the spec's "main gap": with all snippet/expand/file-ref I/O behind `ProjectFiles`, a tree-mode build is genuinely fs-free for these readers (the provider plumb for `loadContentFromTree` is WORK-484).
- The granular containment messages (absolute/escapes/symlink) necessarily fold into one "cannot be resolved" message since containment moved into the provider per AC #3; the line-slicing diagnostics (clamp/past-EOF/inverted/malformed) are untouched.
- `read-file.ts` no longer imports `node:fs`, keeping the runes package tree-shakable for browser bundles.
- Full monorepo builds green; `runes` + `content` suites pass (1043 tests).

{% /work %}
