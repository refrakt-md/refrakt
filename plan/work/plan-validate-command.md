{% work id="WORK-033" status="ready" priority="medium" complexity="moderate" tags="cli, plan, ci" %}

# `plan validate` Command

> Ref: {% ref "SPEC-022" /%} (Plan CLI — `validate` section)

## Summary

Structural validation for plan files with CI-friendly exit codes. Checks for broken references, duplicate IDs, invalid attribute values, circular dependencies, and consistency issues. Add `npx refrakt plan validate --strict` to CI in one line.

## Acceptance Criteria

- [ ] Detects broken `ref`/`xref` links — entity ID not found (error)
- [ ] Detects duplicate IDs across all plan files (error)
- [ ] Detects invalid status, priority, and severity values (error)
- [ ] Detects circular dependencies (error)
- [ ] Detects orphaned work items with no milestone assigned (warning)
- [ ] Detects completed milestones with open work items (warning)
- [ ] `--strict` promotes warnings to errors
- [ ] Exit codes: 0 = clean, 1 = errors found, 2 = bad arguments
- [ ] `--format json` for programmatic consumption
- [ ] Tests for each check type

## Dependencies

- {% ref "WORK-027" /%} (plugin architecture)
- {% ref "WORK-028" /%} (plan file scanner)

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}
