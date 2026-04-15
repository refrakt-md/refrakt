{% work id="WORK-145" status="done" priority="high" complexity="simple" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract pure diffing functions into diff module

Extract the pure diffing and parsing functions from `history.ts` into a new `diff.ts` module with zero Node.js imports. The existing `history.ts` re-imports from `diff.ts` for its git-based history extraction.

## Acceptance Criteria

- [x] New file `runes/plan/src/diff.ts` exists and contains all pure diffing functions
- [x] `diff.ts` has zero imports from `node:fs`, `node:path`, or `node:child_process`
- [x] `diffAttributes(prev, curr)` is exported from `diff.ts` with `AttributeChange` type
- [x] `diffCriteria(prev, curr)` is exported from `diff.ts` with `CriteriaChange` type
- [x] `parseTagAttributes(line)` is exported from `diff.ts`
- [x] `parseCheckboxes(content)` is exported from `diff.ts` with `ParsedCheckbox` type
- [x] `hasResolutionSection(content)` is exported from `diff.ts`
- [x] `history.ts` imports from `diff.ts` and re-exports the types for backwards compatibility
- [x] All existing imports from `./history` continue to work (no breaking changes)
- [x] Existing history tests pass without modification

## Approach

1. Create `diff.ts` and move the five pure functions plus their types (`AttributeChange`, `CriteriaChange`, `ParsedCheckbox`) and supporting regex constants (`TAG_ATTR_RE`, `CHECKBOX_RE`, `RESOLUTION_RE`).
2. In `history.ts`, replace the moved code with imports: `import { diffAttributes, diffCriteria, parseTagAttributes, parseCheckboxes, hasResolutionSection, type AttributeChange, type CriteriaChange, type ParsedCheckbox } from './diff.js'` and re-export them.
3. Git transport functions (`getFileCommits`, `getFileAtCommit`, `extractEntityHistory`, `getBatchCommits`, `extractBatchHistory`, `isShallowClone`) and cache functions stay in `history.ts`.
4. Run existing tests to confirm no regressions.

## Dependencies

None — independent of the scanner-core extraction.

## References

- {% ref "SPEC-040" /%} — Edge Runtime Compatibility for Plan Package
- {% ref "SPEC-038" /%} — Git-Native Entity History

## Resolution

Completed: 2026-04-14

Branch: `claude/edge-runtime-refactor-HOg8v`

### What was done
- Created `runes/plan/src/diff.ts` with all pure diffing functions (diffAttributes, diffCriteria, parseTagAttributes, parseCheckboxes, hasResolutionSection) and their types (AttributeChange, CriteriaChange, ParsedCheckbox)
- Updated `runes/plan/src/history.ts` to import from diff.ts and re-export all functions and types for backwards compatibility

### Notes
- diff.ts has zero dependencies on Node.js APIs — only pure TypeScript
- All 31 history tests pass without modification

{% /work %}
