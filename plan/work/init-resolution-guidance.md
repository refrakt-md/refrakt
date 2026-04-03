{% work id="WORK-075" status="done" priority="low" complexity="trivial" tags="plan, cli" milestone="v0.9.0" %}

# Update plan init CLAUDE.md template with resolution guidance

Update the workflow section that `refrakt plan init` writes to CLAUDE.md to include guidance on using `--resolve` when completing work items.

## Acceptance Criteria
- [x] `WORKFLOW_SECTION` in `runes/plan/src/commands/init.ts` includes a step for `--resolve` when marking items done
- [x] The guidance matches the pattern from SPEC-027: "when marking a work item done, always provide a `--resolve` summary unless the change is trivial"
- [x] Existing plan CLAUDE.md workflow instructions are consistent with the updated template

## Approach

Update the `WORKFLOW_SECTION` constant in `runes/plan/src/commands/init.ts` to add a resolve step between "check off criteria" and "mark complete". Also update `plan/CLAUDE.md` in this repo to match.

## References
- {% ref "SPEC-027" /%}
- {% ref "WORK-072" /%} — CLI resolve flag (dependency — flag must exist first)

## Resolution

Completed: 2026-03-30

`WORKFLOW_SECTION` in `runes/plan/src/commands/init.ts` updated with `--resolve` guidance matching SPEC-027 pattern. Root CLAUDE.md already reflects the updated workflow. All criteria verified met.

{% /work %}
