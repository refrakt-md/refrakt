{% work id="WORK-147" status="ready" priority="high" complexity="moderate" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Extract entity card builder and sentiments into cards module

Extract `buildEntityCard()`, `buildDecisionEntry()`, `buildMetaBadge()`, and all sentiment map constants from `pipeline.ts` into a new `cards.ts` module with zero Node.js imports.

## Acceptance Criteria

- [ ] New file `runes/plan/src/cards.ts` exists
- [ ] `cards.ts` has zero imports from `node:fs`, `node:path`, or `node:child_process`
- [ ] `cards.ts` only depends on `@markdoc/markdoc` (pure JS) and `@refrakt-md/types` (type-only imports)
- [ ] `buildEntityCard(entity)` is exported and produces the same Tag structure as the current inline version
- [ ] `buildDecisionEntry(entity)` is exported and produces the same Tag structure
- [ ] `buildMetaBadge(label, value, opts)` is exported
- [ ] All seven sentiment maps are exported as named constants: `WORK_STATUS_SENTIMENT`, `BUG_STATUS_SENTIMENT`, `PRIORITY_SENTIMENT`, `SEVERITY_SENTIMENT`, `SPEC_STATUS_SENTIMENT`, `DECISION_STATUS_SENTIMENT`, `MILESTONE_STATUS_SENTIMENT`
- [ ] Pipeline imports card builders and sentiments from `./cards.js` instead of defining them inline
- [ ] All existing backlog, decision-log, and relationship rendering produces identical output
- [ ] Existing tests pass without modification

## Approach

1. Create `cards.ts`. Move the seven sentiment map constants, `buildMetaBadge()`, `buildEntityCard()`, and `buildDecisionEntry()` from `pipeline.ts`.
2. The card builders use `EntityRegistration` from `@refrakt-md/types` for the entity parameter type and `Tag` from `@markdoc/markdoc` for constructing renderables — both are pure, edge-safe dependencies.
3. In `pipeline.ts`, replace the moved code with: `import { buildEntityCard, buildDecisionEntry, buildMetaBadge, WORK_STATUS_SENTIMENT, ... } from './cards.js'`.
4. Verify that `pipeline.ts` no longer defines any sentiment maps or card builder functions.
5. Run existing tests to confirm no regressions.

## Dependencies

None — independent of other extractions.

## References

- {% ref "SPEC-040" /%} — Edge Runtime Compatibility for Plan Package

{% /work %}
