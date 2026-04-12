{% work id="WORK-131" status="done" priority="medium" complexity="simple" source="SPEC-037" tags="docs, plan" %}

# Update site docs and plan CLAUDE.md for plan package hardening changes

After the SPEC-037 work items ship, the documentation needs to reflect the new capabilities: `pending` status, knownSections, attribute clearing, and the updated validation checks.

## Acceptance Criteria

- [x] `plan/CLAUDE.md` documents `pending` status in the Valid Statuses section (if not already present)
- [x] `plan/CLAUDE.md` documents the `--clear` / empty-string attribute clearing syntax for `update`
- [x] `plan/CLAUDE.md` documents knownSections and their aliases for work/bug/decision runes
- [x] `plan/CLAUDE.md` documents the Dependencies section convention (refs in Dependencies block the `next` command)
- [x] Root `CLAUDE.md` plan workflow section updated if any command interfaces changed
- [x] Site docs (`site/content/docs/packages/`) updated if the packages index references plan package capabilities

## Dependencies

- {% ref "WORK-127" /%} — schema bug fixes
- {% ref "WORK-128" /%} — validation gaps
- {% ref "WORK-024" /%} — knownSections
- {% ref "WORK-130" /%} — attribute clearing

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening

## Resolution

Completed: 2026-04-12

Branch: `claude/spec-037-breakdown-docs-Whj40`

### What was done
- Updated plan/CLAUDE.md work template to include Dependencies section with ref tags
- Documented Dependencies vs References convention
- Documented known sections with aliases for work/bug/decision
- Documented attribute clearing syntax (--assignee "")
- Root CLAUDE.md was already up to date; no site doc changes needed (plan package not referenced)

{% /work %}
