{% work id="WORK-494" status="done" priority="medium" complexity="simple" milestone="v0.28.0" source="SPEC-117" tags="plan, docs, status, claude-md" %}

# Document terminal work statuses and consolidated vocabulary

Update the canonical spec and agent-facing docs so the new `work` terminals and the `pending` status are described everywhere authors and agents look.

## Acceptance Criteria
- [x] {% ref "SPEC-021" /%} `work` attribute table and status-badge table updated to include `pending`, `cancelled`, `superseded`, and the `supersedes` attribute
- [x] `plan/CLAUDE.md` documents when to use `cancelled` vs `superseded` vs deleting a file
- [x] The `plan init` CLAUDE.md template (`commands/init.ts` / `templates.ts`) carries the same guidance so new projects get it
- [x] Site docs under `site/content/docs/plan/` describe the terminal work states
- [x] `refrakt reference` / agent-facing enum output reflects the new values (regenerate if generated)

## Dependencies
- {% ref "WORK-493" /%} — documents the statuses it introduces

## References
- {% ref "SPEC-117" /%} — spec (Documentation)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- SPEC-021 work-attribute + status-badge tables updated (`pending`, `cancelled`, `superseded`, `supersedes`).
- Root `CLAUDE.md` + the `plan init` template document cancelled vs superseded vs delete.
- Site docs (`site/content/runes/plan/work.md`, `plan/docs/plan-entities.md`, `runes/plan/cli.md`) describe the terminal states.

### Notes
- Agent-facing enum output derives from `enums.ts`, so `refrakt reference` reflects the new values automatically.

{% /work %}
