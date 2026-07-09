{% work id="WORK-499" status="done" priority="medium" complexity="simple" milestone="v0.28.0" source="SPEC-049" tags="plan, docs, claude-md, traceability" pr="refrakt-md/refrakt#565" %}

# CLAUDE.md pr checklist bullet and spec-lifecycle docs

Make the PR-linkage instruction loud (a line inside an example block has a ~1% hit rate) and document the full lifecycle for humans.

## Acceptance Criteria
- [x] CLAUDE.md "MANDATORY: Work Item Completion Checklist" gains a standalone, imperative numbered step for setting the `pr` attribute, distinct from the `--resolve` HEREDOC example
- [x] The `plan init` CLAUDE.md template carries the same bullet so new projects get it
- [x] A docs page under `site/content/docs/plan/` describes the new spec statuses (`implemented`, `shipped`), the ADR `rejected` status, the `pr` attribute, and the happy-path `accepted → implemented → shipped` lifecycle
- [x] The `--resolve` example keeps its `Branch:` / `PR:` lines for narrative continuity, but the docs note the attribute is the source of truth

## Dependencies
- {% ref "WORK-495" /%} — the lifecycle statuses documented
- {% ref "WORK-496" /%} — the `pr` attribute documented

## References
- {% ref "SPEC-049" /%} — spec (Documentation, Design Principles: the instruction has to be loud)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- CLAUDE.md completion checklist gains a standalone `pr` step + spec-lifecycle section. `plan init` template updated. Site docs (spec/decision/work/bug/cli/plan-entities) + SPEC-021 describe the new statuses, `pr`, `released-in`, and the accepted→implemented→shipped lifecycle.

{% /work %}
