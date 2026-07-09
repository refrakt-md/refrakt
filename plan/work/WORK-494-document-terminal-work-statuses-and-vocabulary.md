{% work id="WORK-494" status="draft" priority="medium" complexity="simple" milestone="v0.28.0" source="SPEC-117" tags="plan, docs, status, claude-md" %}

# Document terminal work statuses and consolidated vocabulary

Update the canonical spec and agent-facing docs so the new `work` terminals and the `pending` status are described everywhere authors and agents look.

## Acceptance Criteria
- [ ] {% ref "SPEC-021" /%} `work` attribute table and status-badge table updated to include `pending`, `cancelled`, `superseded`, and the `supersedes` attribute
- [ ] `plan/CLAUDE.md` documents when to use `cancelled` vs `superseded` vs deleting a file
- [ ] The `plan init` CLAUDE.md template (`commands/init.ts` / `templates.ts`) carries the same guidance so new projects get it
- [ ] Site docs under `site/content/docs/plan/` describe the terminal work states
- [ ] `refrakt reference` / agent-facing enum output reflects the new values (regenerate if generated)

## Dependencies
- {% ref "WORK-493" /%} — documents the statuses it introduces

## References
- {% ref "SPEC-117" /%} — spec (Documentation)

{% /work %}
