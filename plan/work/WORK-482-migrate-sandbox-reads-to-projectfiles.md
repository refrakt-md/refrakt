{% work id="WORK-482" status="done" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,runes,sandbox,security,pipeline" %}

# Migrate sandbox reads to `ProjectFiles` + close the `src` traversal gap

Move the sandbox example read seam (`__sandboxReadFile` family + preprocess `sandbox` hooks)
onto the {% ref "WORK-481" /%} `ProjectFiles` provider, and route the sandbox `src` directory
join through it so it inherits containment — closing the unguarded `examplesDir + '/' + src`
path-traversal gap.

## Scope

- **Hook family → provider** — the transform-time `__sandboxReadFile`/`__sandboxListDir`/`__sandboxDirExists` variables and the preprocess-context `sandbox` hooks become a `ProjectFiles` (the hook shape is already identical — a rename + containment upgrade). Keep null-provider behaviour in tree mode when no provider is supplied.
- **`src` join containment** — `packages/runes/src/tags/sandbox.ts` (`examplesDir + '/' + src`, currently unguarded string concat → `assembleFromDirectory`) resolves through the provider, so `src="../…"` is rejected by the provider's containment and surfaces the in-band sandbox error.
- **Regression test** — `{% sandbox src="../escape" %}` resolves to the in-band error message in both `fsProjectFiles` and `memoryProjectFiles`.

## Acceptance Criteria

- [x] Sandbox example resolution (transform `__sandboxReadFile` family + preprocess hooks) consumes `ProjectFiles`.
- [x] The sandbox `src` directory join inherits containment; `{% sandbox src="../…" %}` resolves to the in-band error message, with a regression test, in both providers.
- [x] Existing sandbox tests/showcases pass unchanged for well-formed `src` values.

## Dependencies

- {% ref "WORK-481" /%} — the `ProjectFiles` interface + providers.

## References

- {% ref "SPEC-113" /%} §3 (sandbox examples) — the unguarded join: `packages/runes/src/tags/sandbox.ts`, `packages/runes/src/sandbox-sources.ts` (`assembleFromDirectory`).

## Resolution

Completed: 2026-06-30

Branch: `claude/milestone-v0-27-0-yqiu8v`

### What was done
- `packages/runes/src/tags/sandbox.ts` — directory-source mode now reads through a single injected `__sandboxFiles: ProjectFiles` (replacing the `__sandboxReadFile`/`__sandboxListDir`/`__sandboxDirExists` trio). `examplesDir` is a project-root-relative key; `examplesDir + '/' + src` produces a project-relative key the provider resolves *with containment*, so a root-escaping `src="../…"` is denied and surfaces the in-band "directory not found" error. `assembleFromDirectory`'s callback signature is unchanged — the provider methods are passed as the read/list/exists callbacks.
- `packages/content/src/site.ts` — `loadContent` (fs mode) constructs `fsProjectFiles(resolvedProjectRoot)` and converts the examples dir to a project-relative key via `posixRelativeFromRoot`. Removed the absolute-path `sandboxReadFile`/`sandboxListDir`/`sandboxDirExists` helpers (and the now-unused `node:fs` import); `ProcessContentTreeOptions.sandbox` is now a `ProjectFiles`; the null default is `nullProjectFiles`; both transform-variable surfaces set `__sandboxFiles`. `loadContentFromTree` is untouched (its `projectFiles` plumb is WORK-484), so tree mode keeps sandbox `src` disabled as before.
- `packages/types/src/pipeline.ts` — `PreprocessContext.sandbox` retyped from the inline `{read,list,exists}` to `ProjectFiles` (the shape was already identical; the field has no consumer yet — reserved for WORK-483).
- Tests: `sandbox.test.ts` and `bg-preset.test.ts` mocks now build a `memoryProjectFiles` provider over relative keys (bg-preset uses `recordingProjectFiles` to assert each scene file is read once). Added a `sandbox src containment (SPEC-113)` suite proving a root-escaping `src` yields the in-band error and never leaks the out-of-root file — against **both** `memoryProjectFiles` and `fsProjectFiles` (real temp dir + sibling outside-root file).

### Notes
- Containment is rooted at the **project root** (the provider's anchor), which is exactly the traversal gap the spec names (`examplesDir + '/' + src` could previously climb to `/etc/...`). Within-project reads to sibling dirs remain possible by design — the whole project is inside the author's trust boundary — and only files with sandbox roles (.html/.css/.js/…) are ever assembled.
- Only `sandbox.ts` reads these variables in `src`, so the bg-preset expansion path (which routes through the sandbox transform with the same `config.variables`) inherited the migration with no separate change.
- Full monorepo builds green; entire `runes`/`content`/`types` suites pass (1087 tests).

{% /work %}
