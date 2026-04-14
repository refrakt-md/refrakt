{% work id="WORK-145" status="ready" priority="high" complexity="simple" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract pure diffing functions into diff module

Extract the pure diffing and parsing functions from `history.ts` into a new `diff.ts` module with zero Node.js imports. The existing `history.ts` re-imports from `diff.ts` for its git-based history extraction.

## Acceptance Criteria

- [ ] New file `runes/plan/src/diff.ts` exists and contains all pure diffing functions
- [ ] `diff.ts` has zero imports from `node:fs`, `node:path`, or `node:child_process`
- [ ] `diffAttributes(prev, curr)` is exported from `diff.ts` with `AttributeChange` type
- [ ] `diffCriteria(prev, curr)` is exported from `diff.ts` with `CriteriaChange` type
- [ ] `parseTagAttributes(line)` is exported from `diff.ts`
- [ ] `parseCheckboxes(content)` is exported from `diff.ts` with `ParsedCheckbox` type
- [ ] `hasResolutionSection(content)` is exported from `diff.ts`
- [ ] `history.ts` imports from `diff.ts` and re-exports the types for backwards compatibility
- [ ] All existing imports from `./history` continue to work (no breaking changes)
- [ ] Existing history tests pass without modification

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

{% /work %}
