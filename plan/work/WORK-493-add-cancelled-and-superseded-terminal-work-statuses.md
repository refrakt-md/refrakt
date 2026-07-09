{% work id="WORK-493" status="done" priority="high" complexity="moderate" milestone="v0.28.0" source="SPEC-117" tags="plan, status, work, terminal, lifecycle" %}

# Add cancelled and superseded terminal work statuses

Give `work` items an honest way to be retired: `cancelled` (deliberately not doing it) and `superseded` (replaced by another item), plus a `supersedes` attribute. Both are terminal and non-achieving. Builds on the consolidated vocabulary from {% ref "WORK-492" /%}.

## Acceptance Criteria
- [x] `work` rune accepts `cancelled` and `superseded` status values (schema `tags/work.ts`, `enums.ts` `VALID_STATUS`, and MCP `plan.update` input schema)
- [x] `work` rune accepts an optional single-valued `supersedes` attribute referencing an entity ID (added to `ALLOWED_ATTRS.work`)
- [x] `cancelled` / `superseded` are registered in `TERMINAL_STATUSES.work` but not `ACHIEVING_STATUSES.work`
- [x] `cancelled` / `superseded` work items are excluded from `plan next`, from milestone progress numerators, and from `plan-progress` achieved counts
- [x] `config.ts` work `sentimentMap` gains muted/caution entries for `cancelled` and `superseded`; render-pipeline orderings sort them into the terminal tail
- [x] `supersedes` produces a `superseded-by` / `supersedes` relationship edge in `relationships.ts`
- [x] `plan validate` warns on a `superseded` work item with no `supersedes`, and no longer warns about a `## Resolution` present on a `cancelled` / `superseded` item
- [x] Tests cover: schema acceptance, exclusion from `next`/progress, the `supersedes`-missing warning, and the resolution-on-terminal carve-out

## Dependencies
- {% ref "WORK-492" /%} — adds values to the consolidated `enums.ts` shape

## References
- {% ref "SPEC-117" /%} — spec (New `work` statuses, New `work` attribute, Validation)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- `work` accepts `cancelled`/`superseded` + a `supersedes` attribute (schema, `enums.ts`, `ALLOWED_ATTRS`, MCP).
- Both registered terminal-but-not-achieving; excluded from `plan next`, milestone numerators, `plan-progress`.
- `supersedes` builds a `supersedes`/`superseded-by` edge (relationships.ts + pipeline plumbing).
- `validate` warns on `superseded` without `supersedes` and carves out the resolution-on-terminal warning.
- Tests in `test/vocabulary.test.ts`.

{% /work %}
