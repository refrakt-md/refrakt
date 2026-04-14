{% work id="WORK-144" status="done" priority="high" complexity="moderate" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract pure scanner functions into scanner-core module

Split `scanner.ts` so that pure functions (`parseFileContent`, `scanPlanSources`, and all supporting AST helpers) live in a new `scanner-core.ts` with zero Node.js imports. The existing `scanner.ts` re-imports from `scanner-core.ts` and adds filesystem-dependent functions.

## Acceptance Criteria

- [x] New file `runes/plan/src/scanner-core.ts` exists and contains all pure scanner functions
- [x] `scanner-core.ts` has zero imports from `node:fs`, `node:path`, `node:child_process`, or `@refrakt-md/content`
- [x] `parseFileContent(source, relPath)` is exported from `scanner-core.ts`
- [x] `scanPlanSources(sources)` is exported from `scanner-core.ts`
- [x] All supporting pure functions (`extractCriteria`, `extractResolution`, `extractRefs`, `extractScopedRefs`, `walkNodes`, `extractHeadingText`, `matchKnownSection`, `extractTitle`) move to `scanner-core.ts`
- [x] `scanner.ts` imports from `scanner-core.ts` and re-exports the pure functions alongside its filesystem functions
- [x] All existing imports from `./scanner` and the main entry point continue to work (no breaking changes)
- [x] `index.ts` re-exports `parseFileContent` and `scanPlanSources` unchanged
- [x] Existing tests pass without modification

## Approach

1. Create `scanner-core.ts` and move all pure functions into it. Keep the Markdoc import (pure JS, no Node.js APIs) and any type imports from `./types.ts`.
2. In `scanner.ts`, replace the moved function bodies with `import { parseFileContent, scanPlanSources, ... } from './scanner-core.js'` and `export { parseFileContent, scanPlanSources } from './scanner-core.js'`.
3. Filesystem-dependent functions (`parseFile`, `scanPlanFiles`, `collectMdFiles`, `readCache`, `writeCache`) stay in `scanner.ts`.
4. Verify that `scanner.ts` is the only file that imports `node:fs`, `node:path`, and `@refrakt-md/content`.
5. Run existing tests to confirm no regressions.

## Dependencies

None — this is the first extraction step.

## References

- {% ref "SPEC-040" /%} — Edge Runtime Compatibility for Plan Package

## Resolution

Completed: 2026-04-14

Branch: `claude/edge-runtime-refactor-HOg8v`

### What was done
- Created `runes/plan/src/scanner-core.ts` with all pure scanner functions (parseFileContent, scanPlanSources, extractCriteria, extractResolution, extractRefs, extractScopedRefs, walkNodes, extractHeadingText, matchKnownSection, extractTitle, and supporting constants)
- Rewrote `runes/plan/src/scanner.ts` to import from scanner-core and re-export pure functions; kept only filesystem-dependent code (parseFile, scanPlanFiles, collectMdFiles, readCache, writeCache, getGitMtimes)
- index.ts re-exports unchanged — no breaking changes to public API

### Notes
- scanner-core.ts depends only on @markdoc/markdoc (pure JS) and @refrakt-md/runes (escapeFenceTags only)
- All 321 plan tests pass without modification

{% /work %}
