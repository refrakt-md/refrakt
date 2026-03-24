{% work id="WORK-055" status="ready" priority="high" complexity="complex" tags="learning, pipeline" milestone="v0.9.0" %}

# Learning Package Pipeline Hooks

> Ref: SPEC-002 (Cross-Page Pipeline — Content Aggregation, Content Injection)

## Summary

The `@refrakt-md/learning` package has runes that require cross-page awareness: `glossary` needs all `concept` definitions to build a term index, `prerequisite` needs a dependency graph between lessons, and `concept` terms should auto-link across the site. None of this works today because the learning package has no pipeline hooks.

This is the most complex pipeline integration because it implements three distinct cross-page patterns: content aggregation (glossary), content injection (term auto-linking), and placeholder resolution (prerequisite graph).

## Acceptance Criteria

- [ ] Learning package exports `pipelineHooks` with `register`, `aggregate`, and `postProcess` hooks
- [ ] `register` hook registers entities for: concept (term + definition), lesson (from pages containing learning runes)
- [ ] `register` hook registers prerequisite relationships between lessons
- [ ] `aggregate` hook builds a glossary index from all concept/term entities, sorted alphabetically
- [ ] `aggregate` hook builds a prerequisite dependency graph from lesson entities
- [ ] `aggregate` hook detects prerequisite cycles and emits pipeline warnings
- [ ] `postProcess` hook populates `glossary` rune placeholders with the aggregated term index
- [ ] `postProcess` hook auto-links concept terms in prose — first occurrence per page, excluding headings/code/runes
- [ ] `postProcess` hook resolves `prerequisite` rune placeholders with dependency data
- [ ] Auto-linked terms don't link on their own definition page
- [ ] Tests cover term registration, glossary aggregation, auto-linking, cycle detection, and prerequisite resolution

## Approach

**Registration:** Walk transformed pages for `Concept` and `Prerequisite` nodes. Register each concept as a `term` entity with name and definition text. Register pages containing learning runes as `lesson` entities. Register prerequisite relationships as edges in the dependency data.

**Aggregation:** Build the glossary index by sorting all term entities alphabetically. Build the prerequisite graph using a directed graph structure. Run cycle detection (topological sort) and emit warnings for cycles.

**Post-processing:** For glossary runes, inject the full term list from the aggregated index. For term auto-linking, walk all text nodes and match against the glossary index, wrapping first occurrences in links. For prerequisite runes, resolve the placeholder with dependency graph data (upstream/downstream lessons).

## References

- SPEC-002 (Cross-Page Pipeline — Pattern 2: Content Aggregation, Pattern 3: Content Injection)
- SPEC-001 (Community Runes — `@refrakt-md/learning` implementation note)

{% /work %}
