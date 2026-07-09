{% work id="WORK-499" status="draft" priority="medium" complexity="simple" milestone="v0.28.0" source="SPEC-049" tags="plan, docs, claude-md, traceability" %}

# CLAUDE.md pr checklist bullet and spec-lifecycle docs

Make the PR-linkage instruction loud (a line inside an example block has a ~1% hit rate) and document the full lifecycle for humans.

## Acceptance Criteria
- [ ] CLAUDE.md "MANDATORY: Work Item Completion Checklist" gains a standalone, imperative numbered step for setting the `pr` attribute, distinct from the `--resolve` HEREDOC example
- [ ] The `plan init` CLAUDE.md template carries the same bullet so new projects get it
- [ ] A docs page under `site/content/docs/plan/` describes the new spec statuses (`implemented`, `shipped`), the ADR `rejected` status, the `pr` attribute, and the happy-path `accepted → implemented → shipped` lifecycle
- [ ] The `--resolve` example keeps its `Branch:` / `PR:` lines for narrative continuity, but the docs note the attribute is the source of truth

## Dependencies
- {% ref "WORK-495" /%} — the lifecycle statuses documented
- {% ref "WORK-496" /%} — the `pr` attribute documented

## References
- {% ref "SPEC-049" /%} — spec (Documentation, Design Principles: the instruction has to be loud)

{% /work %}
