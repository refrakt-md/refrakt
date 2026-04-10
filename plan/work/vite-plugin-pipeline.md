{% work id="WORK-097" status="ready" priority="medium" complexity="moderate" tags="vite, pipeline, content" milestone="v1.0.0" source="SPEC-031" %}

# Vite plugin — Level 2 cross-page pipeline

Implement the `level: 'pipeline'` mode that runs the full four-phase cross-page pipeline at build time, enabling breadcrumbs, nav, glossary auto-linking, and other entity-dependent features.

## Acceptance Criteria

- [ ] When `level: 'pipeline'` and `contentDir` are set, plugin scans all `.md` files in `contentDir` at `buildStart`
- [ ] Full pipeline runs via `runPipeline()` from `@refrakt-md/content`: parse → register → aggregate → post-process
- [ ] Entity registry is built (`EntityRegistryImpl`) and available to all pages
- [ ] Output modules include enriched `meta` with `entities` and `crossPageDeps` arrays
- [ ] Cross-page runes (`breadcrumb`, `nav`, `glossary`) render fully resolved content
- [ ] Page hierarchy derived from file system relative to `contentDir`; frontmatter can override title/slug
- [ ] Pipeline results cached in memory; individual `transform` calls read from cache
- [ ] Dev mode: file changes re-parse changed file; if entities change, dependent files are re-processed
- [ ] `@refrakt-md/content` is an optional peer dependency (only needed for Level 2)
- [ ] Clear error message if `level: 'pipeline'` is set but `@refrakt-md/content` is not installed
- [ ] Clear error message if `level: 'pipeline'` is set but `contentDir` is missing

## Approach

1. Implement `src/pipeline.ts` — wraps `runPipeline()` with Vite build lifecycle hooks
2. In `buildStart`: scan `contentDir`, run full pipeline, cache results
3. In `transform`: read from cache instead of re-processing
4. In dev mode: use `handleHotUpdate` to detect entity changes and selectively re-run pipeline phases
5. Reference `packages/sveltekit/src/plugin.ts` for existing `buildStart` pipeline pattern

## Dependencies

- WORK-094 — core plugin must exist first
- WORK-096 — HMR infrastructure for dev mode re-processing

## References

- SPEC-031 (Level 2: Cross-Page Pipeline section)
- `packages/content/src/pipeline.ts` — `runPipeline()` orchestrator
- `packages/content/src/registry.ts` — `EntityRegistryImpl`

{% /work %}
