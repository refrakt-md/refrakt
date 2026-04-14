{% work id="WORK-144" status="ready" priority="high" complexity="moderate" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract pure scanner functions into scanner-core module

Split `scanner.ts` so that pure functions (`parseFileContent`, `scanPlanSources`, and all supporting AST helpers) live in a new `scanner-core.ts` with zero Node.js imports. The existing `scanner.ts` re-imports from `scanner-core.ts` and adds filesystem-dependent functions.

## Acceptance Criteria

- [ ] New file `runes/plan/src/scanner-core.ts` exists and contains all pure scanner functions
- [ ] `scanner-core.ts` has zero imports from `node:fs`, `node:path`, `node:child_process`, or `@refrakt-md/content`
- [ ] `parseFileContent(source, relPath)` is exported from `scanner-core.ts`
- [ ] `scanPlanSources(sources)` is exported from `scanner-core.ts`
- [ ] All supporting pure functions (`extractCriteria`, `extractResolution`, `extractRefs`, `extractScopedRefs`, `walkNodes`, `extractHeadingText`, `matchKnownSection`, `extractTitle`) move to `scanner-core.ts`
- [ ] `scanner.ts` imports from `scanner-core.ts` and re-exports the pure functions alongside its filesystem functions
- [ ] All existing imports from `./scanner` and the main entry point continue to work (no breaking changes)
- [ ] `index.ts` re-exports `parseFileContent` and `scanPlanSources` unchanged
- [ ] Existing tests pass without modification

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

{% /work %}
