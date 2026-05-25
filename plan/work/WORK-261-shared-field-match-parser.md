{% work id="WORK-261" status="done" priority="high" complexity="moderate" source="SPEC-070" tags="runes, registry, collection, filter" milestone="v0.16.0" %}

# Shared field-match parser

Implement the canonical `field:value` selector grammar from SPEC-070 as a single shared module in `@refrakt-md/runes`, consumed by `collection`, `entityRoutes` (SPEC-069), and `backlog`. The existing `plugins/plan/src/filter.ts` folds into it, gaining glob/regex, `url` resolution, and case-consistency while preserving backlog behavior.

## Acceptance Criteria
- [ ] Parser splits each clause on its first colon; double-quoted values carry spaces; malformed clauses (no colon / empty field) are ignored with a build warning; empty filter matches everything
- [ ] Operator selected by value shape: exact (default), glob (`*`, anchored full-match), regex (`/.../` with optional flags)
- [ ] Field resolution checks top-level (`id`, `type`, `sourceFile`) then `data[field]`; `url` aliases to `sourceUrl ?? data.url ?? ''`
- [ ] Array-valued fields match on membership (any element); matching is case-sensitive
- [ ] Same-field clauses OR; different fields AND
- [ ] `plugins/plan/src/filter.ts` is replaced by the shared parser (backlog behavior preserved)
- [ ] Unit tests cover exact/glob/regex, quoting, arrays, `url` alias, AND/OR, and malformed-clause warnings

## Dependencies
None — this is foundation work that WORK-263 and WORK-268 build on.

## References

- {% ref "SPEC-070" /%} — Field-match grammar (canonical definition)
- {% ref "SPEC-069" /%} — entityRoutes `filter` consumes the same parser

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- Added `packages/runes/src/field-match.ts`: the canonical SPEC-070 grammar — `tokenize` (quote-aware), `parseFieldMatch` (first-colon split, OR-grouping, malformed-clause warnings), `resolveEntityField` (top-level→data, `url`→`sourceUrl??data.url`), `matchesFieldMatch` (operator-by-value-shape: exact/glob/regex; array+comma membership; AND-across/OR-within; case-sensitive), plus `matchesFilterExpr` convenience.
- Exported the above from `packages/runes/src/index.ts`.
- Replaced `plugins/plan/src/filter.ts` `parseFilter`/`matchesFilter` with delegations to the shared module (`ParsedFilter` is now `ParsedFieldMatch`); kept `sortEntities`/`groupEntities` local.
- Tests: `packages/runes/test/field-match.test.ts` (13) green; updated `plugins/plan/test/filter.test.ts` to the new parsed shape; plan filter+backlog suites green.

### Notes
- Glob is anchored full-match (`*`→`.*`). Regex detection uses a metacharacter heuristic so a slash-wrapped path with no metachars (e.g. `url:/blog/`) stays an exact match rather than being misread as a regex — important since URL filtering is a primary use case.
- Strings are normalized to candidates by comma-split, preserving plan's tags membership without a data-shape change.

{% /work %}
