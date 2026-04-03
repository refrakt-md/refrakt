{% work id="WORK-116" status="ready" priority="medium" complexity="moderate" tags="cli, tooling, transform" milestone="v1.0.0" %}

# Update inspect and contracts tooling for structure slots features

Update `refrakt inspect` and `refrakt contracts` to surface the new SPEC-033 features: slot assignments, projection effects, and repeated elements.

## Acceptance Criteria

- [ ] `refrakt inspect` output shows slot assignments when a rune config declares `slots`
- [ ] `refrakt inspect` visualizes projection effects (shows before/after tree when projection is active)
- [ ] `refrakt inspect --audit` flags new BEM selectors created by projection `group` entries
- [ ] `refrakt contracts` includes slot ordering in structure contracts
- [ ] `refrakt contracts` includes projection declarations and warns on invalid `data-name` references (targeting a data-name that doesn't exist in the rune's output)
- [ ] `refrakt contracts --check` catches drift from slot/projection changes
- [ ] All existing CLI tests pass

## Approach

1. Update the inspect renderer to show slot groupings in the HTML output
2. Add projection visualization — when projection is configured, show the tree before and after the projection pass
3. Update the contracts generator to include slot order and projection declarations in the JSON output
4. Add validation for projection `data-name` references against the rune's known output contract
5. Update the audit logic to account for group-generated BEM selectors

## References

- SPEC-033 (Contracts and Tooling section)
- WORK-112 (slots)
- WORK-114 (projection)

{% /work %}
