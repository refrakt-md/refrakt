{% work id="WORK-084" status="done" priority="high" complexity="moderate" tags="content, pipeline, runes" milestone="v1.0.0" %}

# Inject $file.created and $file.modified Variables into Content Pipeline

> Ref: SPEC-029 Phase 2 (Variable Injection)

Depends on: WORK-083 (shared git timestamp utility)

## Summary

Wire the shared git timestamp utility into `packages/content/src/site.ts` so that every page's Markdoc transform config includes `$file.created` and `$file.modified` variables. These join the existing `$page` and `$frontmatter` variables, making file timestamps available to any rune via standard Markdoc variable references.

## Acceptance Criteria

- [x] `loadContent()` in `packages/content/src/site.ts` calls the git timestamp utility once before the page loop
- [x] Each page's `contentVariables` includes a `file` object with `created` and `modified` string properties
- [x] Three-tier resolution order: frontmatter override > git history > fs.stat fallback
- [x] When no timestamp is available, the variable is `undefined` (not an empty string or null)
- [x] Variables are accessible in Markdoc schemas as `$file.created` and `$file.modified`
- [x] Existing `$page` and `$frontmatter` variables are unaffected
- [x] Integration test: a page with no frontmatter dates gets git-derived `$file.created` and `$file.modified`
- [x] Integration test: a page with explicit frontmatter `created`/`modified` uses those values instead of git data

## Approach

1. Import the git timestamp utility in `packages/content/src/site.ts`
2. Call it once at the start of `loadContent()` with the content root directory
3. In the per-page loop, look up timestamps for each file path and merge into `contentVariables`
4. Apply the three-tier fallback: check frontmatter first, then git map, then fs.stat

## References

- SPEC-029 (Phase 2 — Variable Injection)
- WORK-083 (shared git timestamp utility — dependency)
- `packages/content/src/site.ts` — existing variable injection point

{% /work %}
