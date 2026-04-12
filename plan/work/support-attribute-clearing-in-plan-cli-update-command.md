{% work id="WORK-130" status="done" priority="low" complexity="simple" source="SPEC-037" tags="plan, cli" %}

# Support attribute clearing in plan CLI update command

The `update` command can set or replace attribute values but cannot remove them. Once you set `--assignee claude` or `--milestone v1.0.0`, there's no way to unset it. Support empty string as "clear": `--assignee ""` removes the attribute from the tag.

## Acceptance Criteria

- [x] `--assignee ""` removes the `assignee` attribute from the rune tag
- [x] `--milestone ""` removes the `milestone` attribute from the rune tag
- [x] Works for any optional attribute (`assignee`, `milestone`, `source`, `tags`, `complexity`)
- [x] Change summary shows "removed" for cleared attributes (e.g., `assignee: claude → (removed)`)
- [x] Tests for attribute clearing

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening (Part 4: Missing CLI Capability)

## Resolution

Completed: 2026-04-12

Branch: `claude/spec-037-breakdown-docs-Whj40`

### What was done
- Added removeAttr() helper to update.ts
- Empty string values trigger attribute removal instead of setting empty
- Skip enum validation for empty strings
- 4 new tests for attribute clearing

{% /work %}
