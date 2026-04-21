{% work id="WORK-096" status="ready" priority="medium" complexity="simple" tags="vite, hmr" milestone="v1.0.0" source="SPEC-031" %}

# Vite plugin — dev server HMR

Implement hot module replacement for `.md` file changes during development. When a markdown file is saved, re-transform it and trigger a page update.

## Acceptance Criteria

- [ ] File watcher detects `.md` changes in dev mode
- [ ] Changed file is re-transformed through the full pipeline (parse → transform → render)
- [ ] Vite module graph is invalidated for the changed file via `server.moduleGraph.invalidateModule()`
- [ ] Browser receives update (full reload — same approach as existing sveltekit HMR)
- [ ] Level 2 warnings for cross-page runes display in terminal on file change
- [ ] No unnecessary re-transforms of unchanged files in Level 1 mode

## Approach

1. Implement `src/hmr.ts` — hooks into Vite's `configureServer` and `handleHotUpdate`
2. On `.md` file change: invalidate module, send full reload
3. Reference `packages/sveltekit/src/content-hmr.ts` for existing pattern

## Dependencies

- {% ref "WORK-094" /%} — core plugin must exist first

## References

- {% ref "SPEC-031" /%} (Dev Server section)
- `packages/sveltekit/src/content-hmr.ts` — existing HMR implementation

{% /work %}
