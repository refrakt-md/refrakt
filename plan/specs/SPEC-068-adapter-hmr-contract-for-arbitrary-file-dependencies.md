{% spec id="SPEC-068" status="draft" tags="pipeline, adapters, hmr, dx" %}

# Adapter HMR contract for arbitrary file dependencies

A deferred follow-up to {% ref "SPEC-062" /%} (snippet rune) and {% ref "SPEC-063" /%} (configurable file roots). Both ship initially without HMR support for files outside the content tree — host pages don't auto-refresh when a referenced source file or namespaced partial changes during dev. This spec will define the dependency-tracking model and per-adapter integration that closes the gap.

This is a **placeholder** to capture the design direction so we don't relitigate it later. It will be promoted to `draft` once {% ref "SPEC-062" /%} and {% ref "SPEC-063" /%} have shipped and real usage informs the actual contract.

## Problem

Two new file-reading mechanisms are landing in v0.15.x:

- `{% snippet path="..." /%}` from {% ref "SPEC-062" /%} reads arbitrary project-root-relative files at build time.
- `{% partial file="namespace:..." /%}` from {% ref "SPEC-063" /%} resolves partials from registered roots (user-config-declared or plugin-registered), which may live outside any site's content tree.

The existing content-pipeline HMR watches each site's content tree (`content/` + `_partials/`). Files outside that tree aren't watched, so:

- Editing an embedded source file (`src/lib/foo.ts` referenced via `snippet`) doesn't trigger a rebuild of the host page in dev.
- Editing a partial in a registered root (`../legal/footer.md`) doesn't trigger a rebuild of pages that include it.

Production builds are unaffected — they read every referenced file at build time and commit to a snapshot. The gap is purely dev-experience: until the dev server picks up the change to the external file, the rendered page is stale.

Workaround until this spec ships: save any file inside the content tree (or restart the dev server) to trigger a rebuild that re-reads the external dependencies.

-----

## Design Direction (captured from prior discussion)

**Dependency-tracked watching, not blanket scope.** "Watch the whole project" doesn't work — Linux `inotify` defaults to 8192 watches per user, easily exhausted on monorepos with `node_modules` in scope; userspace ignore-pattern filtering generates noise without solving the underlying limit. The right model is bounded by what's actually referenced.

**Per-page dependency tracking.** During transform, each page accumulates a list of file dependencies (its own source, partials it includes, snippet paths it reads). After the build, the union of those lists is the watch set. When a watched file changes, the reverse-dependency lookup gives the list of pages to rebuild.

**Per-adapter integration.** SvelteKit/Vite has the richest primitives (module graph, HMR API, granular invalidation); Eleventy has its own watch/rebuild model; Astro, Nuxt, Next, and the React/Vue adapters each have their own. The dependency-tracking *data* is shared across adapters; the *integration* is per-adapter. This is the real complexity, not the raw watching.

**Shared with security sandbox.** The watcher must respect the same path-validation as the snippet resolver — no watching files outside the project root, no following symlinks that escape, no permission-elevation surprises. Resolver and watcher should share the validation code.

**Granularity decisions worth thinking through:**

- File-level watch for `snippet` (specific paths referenced).
- Directory-level watch for registered file roots (so new partials get picked up).
- Reference-counted cleanup: when the last reference to a watched file goes away, stop watching.

**Performance ceilings (informational):**

- Typical sites: dozens of extra watched files; negligible.
- Heavy snippet users (API-docs site embedding source files all over): hundreds of files; still well under OS limits.
- Edge case: thousands of references would press Linux's default inotify limit; documented mitigation (`fs.inotify.max_user_watches`) covers it.

-----

## Out of Scope (placeholder, to refine)

- **Watching files for changes during prod builds** — prod builds read once, commit a snapshot, done. This spec is dev-mode only.
- **Watching the entire project blindly** — bounded dependency-tracking is the model.
- **Network filesystems / WSL / aggressive antivirus quirks** — these are out of refrakt's control. Documentation can flag them but the spec doesn't try to solve them.
- **Live reload of arbitrary build outputs** (CSS-in-JS rebuilds, etc.) — frameworks already have this for their native concerns. This spec only covers the refrakt-introduced dependency types.

-----

## Open Questions (placeholder, to expand when promoted to draft)

- Which adapters have native dependency-tracking primitives that can be reused vs. need shimming?
- Should the per-page dependency list be exposed as a public API (e.g., for tooling that wants to compute build graphs), or kept internal to the pipeline?
- How granular should rebuild events be — single-page rebuild via HMR module replacement (where the adapter supports it) vs. full content-pipeline re-run?
- Should adapter integrations live in the adapter packages (`@refrakt-md/sveltekit`, `@refrakt-md/eleventy`, etc.) or in a shared HMR-coordination package?
- Symlink policy: watch the link or the realpath? (Probably the realpath, matching what's actually read, with sandbox-escape rejected at resolve time.)
- Debouncing: rely on the underlying watcher library's defaults (Chokidar etc.) or set refrakt-specific debouncing?
- What's the right developer signal when a dependency changes outside the watcher's known set (e.g., a snippet reference added after the dev server started)? Auto-add to the watcher on next build cycle?

-----

## Dependencies

This spec is informed by the real usage shapes that emerge from:

- {% ref "SPEC-062" /%} — snippet rune (the canonical "read arbitrary project file" consumer)
- {% ref "SPEC-063" /%} — configurable file roots (the canonical "read partials from non-standard locations" consumer)

Both should ship first, accrue some usage, then this spec gets promoted to `draft` with concrete adapter integration requirements drawn from real authoring patterns.

-----

## References

- {% ref "SPEC-062" /%} — snippet rune
- {% ref "SPEC-063" /%} — configurable file roots
- {% ref "SPEC-058" /%} — framework adapter parity (the context for per-adapter contracts)
- `packages/content/src/` — existing content-pipeline HMR plumbing this would extend
- Vite's HMR API documentation — reference model for the SvelteKit adapter path

{% /spec %}
