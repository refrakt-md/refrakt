{% work id="WORK-128" status="done" priority="high" complexity="simple" source="SPEC-037" tags="plan, cli, validation" %}

# Add source, milestone, and complexity validation to plan validate

The `validate` command has blind spots: `source` attribute references to non-existent specs/decisions go undetected, `milestone` references to non-existent milestones pass silently, and complexity values aren't checked at all. These gaps let broken references and invalid data persist.

## Acceptance Criteria

- [x] `validate` resolves each comma-separated ID in `source` against the entity index and reports broken references as errors
- [x] `validate` checks that `milestone` values match an existing milestone entity
- [x] `validate` checks complexity values against the valid set (`trivial`, `simple`, `moderate`, `complex`, `unknown`)
- [x] Broken source references report the referencing entity ID and the missing target ID
- [x] Tests for source validation, milestone validation, and complexity validation

## Dependencies

- {% ref "WORK-127" /%} — schema bug fixes should land first (especially the severity/complexity alignment)

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening (Part 2: Validation Gaps)

## Resolution

Completed: 2026-04-12

Branch: `claude/spec-037-breakdown-docs-Whj40`

### What was done
- Added checkSourceRefs(): validates comma-separated source IDs against entity index
- Added checkMilestoneRefs(): validates milestone values against existing milestones
- Complexity validation already handled by WORK-127
- 5 new tests for source/milestone validation

{% /work %}
