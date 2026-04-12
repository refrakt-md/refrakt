{% work id="WORK-130" status="ready" priority="low" complexity="simple" source="SPEC-037" tags="plan, cli" %}

# Support attribute clearing in plan CLI update command

The `update` command can set or replace attribute values but cannot remove them. Once you set `--assignee claude` or `--milestone v1.0.0`, there's no way to unset it. Support empty string as "clear": `--assignee ""` removes the attribute from the tag.

## Acceptance Criteria

- [ ] `--assignee ""` removes the `assignee` attribute from the rune tag
- [ ] `--milestone ""` removes the `milestone` attribute from the rune tag
- [ ] Works for any optional attribute (`assignee`, `milestone`, `source`, `tags`, `complexity`)
- [ ] Change summary shows "removed" for cleared attributes (e.g., `assignee: claude → (removed)`)
- [ ] Tests for attribute clearing

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening (Part 4: Missing CLI Capability)

{% /work %}
