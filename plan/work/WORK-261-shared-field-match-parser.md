{% work id="WORK-261" status="ready" priority="high" complexity="moderate" source="SPEC-070" tags="runes, registry, collection, filter" milestone="v0.16.0" %}

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

{% /work %}
